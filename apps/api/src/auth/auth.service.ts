import { Injectable, UnauthorizedException } from "@nestjs/common";
import { compare, hash } from "bcryptjs";
import { randomBytes, randomInt, createHash } from "node:crypto";
import { authenticator } from "otplib";
import type { TwoFactorMethod, UserRole } from "@rescuebase/domain";
import type { Response } from "express";
import { EMAIL_2FA_TTL_MS, INVITATION_TTL_MS, PASSWORD_RESET_TTL_MS, SESSION_COOKIE_NAME, SESSION_TTL_MS } from "./auth.constants.js";
import { PrismaService } from "../persistence/prisma.service.js";

type UserEmail = { email: string };
type UserInvitation = { id: string; email: string; displayName: string; role: UserRole };
type UserPasswordReset = { id: string; email: string; displayName: string };
type UserSessionView = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  twoFactorEnabled: boolean;
  twoFactorMethod: TwoFactorMethod | null;
  newOrderNotificationsEnabled: boolean;
  deletedAt?: Date | null;
};

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  twoFactorEnabled: boolean;
  twoFactorMethod?: TwoFactorMethod;
  newOrderNotificationsEnabled: boolean;
}

type PendingLoginUser = UserSessionView & {
  active: boolean;
  twoFactorSecret: string | null;
};

type PendingLoginChallengeView = {
  id: string;
  method: TwoFactorMethod;
  emailChallengeId: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
  user: PendingLoginUser;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  hashPassword(password: string): Promise<string> {
    return hash(password, 12);
  }

  async verifyPassword(password: string, passwordHash: string | null): Promise<boolean> {
    if (!passwordHash) {
      return false;
    }
    return compare(password, passwordHash);
  }

  async createSession(response: Response, userId: string): Promise<void> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.userSession.create({
      data: {
        userId,
        tokenHash: this.hashSessionToken(token),
        expiresAt
      }
    });
    response.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      path: "/"
    });
  }

  async destroySession(response: Response, token: string | undefined): Promise<void> {
    if (token) {
      await this.prisma.userSession.deleteMany({ where: { tokenHash: this.hashSessionToken(token) } });
    }
    response.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  }

  async authenticateSession(token: string | undefined): Promise<AuthenticatedUser | null> {
    if (!token) {
      return null;
    }
    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash: this.hashSessionToken(token) },
      include: { user: true }
    });
    if (!session || session.expiresAt <= new Date() || !session.user.active || session.user.deletedAt) {
      if (session) {
        await this.prisma.userSession.delete({ where: { id: session.id } }).catch(() => undefined);
      }
      return null;
    }
    return this.toAuthenticatedUser(session.user);
  }

  createTwoFactorSetup(user: UserEmail): { secret: string; otpauthUrl: string } {
    const secret = authenticator.generateSecret();
    return {
      secret,
      otpauthUrl: authenticator.keyuri(user.email, "RescueBase", secret)
    };
  }

  verifyTotp(code: string, secret: string | null): boolean {
    if (!secret) {
      throw new UnauthorizedException("2FA ist nicht eingerichtet.");
    }
    return authenticator.check(code, secret);
  }

  async createInvitation(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
    await this.prisma.userInvitation.create({
      data: {
        userId,
        tokenHash: this.hashOpaqueToken(token),
        expiresAt
      }
    });
    return { token, expiresAt };
  }

  async consumeInvitation(token: string): Promise<(UserInvitation & { invitationId: string }) | null> {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { tokenHash: this.hashOpaqueToken(token) },
      include: { user: true }
    });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date() || invitation.user.deletedAt) {
      return null;
    }
    return {
      id: invitation.user.id,
      email: invitation.user.email,
      displayName: invitation.user.displayName,
      role: invitation.user.role,
      invitationId: invitation.id
    };
  }

  async markInvitationAccepted(invitationId: string): Promise<boolean> {
    const accepted = await this.prisma.userInvitation.updateMany({
      where: { id: invitationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      data: { acceptedAt: new Date() }
    });
    return accepted.count === 1;
  }

  async createPasswordResetToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: this.hashOpaqueToken(token),
        expiresAt
      }
    });
    return { token, expiresAt };
  }

  async getPasswordReset(token: string): Promise<(UserPasswordReset & { resetId: string }) | null> {
    const reset = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashOpaqueToken(token) },
      include: { user: true }
    });
    if (!reset || reset.consumedAt || reset.expiresAt <= new Date() || reset.user.deletedAt) {
      return null;
    }
    return {
      id: reset.user.id,
      email: reset.user.email,
      displayName: reset.user.displayName,
      resetId: reset.id
    };
  }

  async consumePasswordReset(resetId: string): Promise<boolean> {
    const consumed = await this.prisma.passwordResetToken.updateMany({
      where: { id: resetId, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() }
    });
    return consumed.count === 1;
  }

  async createEmailTwoFactorChallenge(userId: string): Promise<{ challengeId: string; code: string; expiresAt: Date }> {
    const code = `${randomInt(100000, 1000000)}`;
    const expiresAt = new Date(Date.now() + EMAIL_2FA_TTL_MS);
    await this.prisma.emailTwoFactorChallenge.updateMany({
      where: { userId, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() }
    });
    const challenge = await this.prisma.emailTwoFactorChallenge.create({
      data: {
        userId,
        codeHash: this.hashOpaqueToken(code),
        expiresAt
      }
    });
    return { challengeId: challenge.id, code, expiresAt };
  }

  async verifyEmailTwoFactorChallenge(userId: string, challengeId: string, code: string): Promise<boolean> {
    const challenge = await this.prisma.emailTwoFactorChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.userId !== userId || challenge.consumedAt || challenge.expiresAt <= new Date() || challenge.failedAttempts >= 5) {
      return false;
    }
    const valid = challenge.codeHash === this.hashOpaqueToken(code);
    if (!valid) {
      await this.prisma.emailTwoFactorChallenge.updateMany({
        where: { id: challenge.id, userId, consumedAt: null, expiresAt: { gt: new Date() }, failedAttempts: { lt: 5 } },
        data: { failedAttempts: { increment: 1 } }
      });
      return false;
    }
    const consumed = await this.prisma.emailTwoFactorChallenge.updateMany({
      where: { id: challenge.id, userId, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() }
    });
    return consumed.count === 1;
  }

  async createPendingLoginChallenge(userId: string, method: TwoFactorMethod, emailChallengeId?: string): Promise<{ challengeId: string }> {
    const challengeId = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + EMAIL_2FA_TTL_MS);
    await this.prisma.pendingLoginChallenge.updateMany({
      where: { userId, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() }
    });
    await this.prisma.pendingLoginChallenge.create({
      data: {
        userId,
        tokenHash: this.hashOpaqueToken(challengeId),
        method,
        emailChallengeId,
        expiresAt
      }
    });
    return { challengeId };
  }

  async getPendingLoginChallenge(challengeId: string): Promise<PendingLoginChallengeView | null> {
    const challenge = await this.prisma.pendingLoginChallenge.findUnique({
      where: { tokenHash: this.hashOpaqueToken(challengeId) },
      include: { user: true }
    });
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date() || !challenge.user.active || challenge.user.deletedAt) {
      return null;
    }
    return challenge;
  }

  async consumePendingLoginChallenge(id: string): Promise<boolean> {
    const consumed = await this.prisma.pendingLoginChallenge.updateMany({
      where: { id, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() }
    });
    return consumed.count === 1;
  }

  async destroyUserSessions(userId: string): Promise<void> {
    await this.prisma.userSession.deleteMany({ where: { userId } });
  }

  toAuthenticatedUser(user: UserSessionView): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorMethod: user.twoFactorMethod ?? undefined,
      newOrderNotificationsEnabled: user.newOrderNotificationsEnabled
    };
  }

  private hashSessionToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  hashOpaqueToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
