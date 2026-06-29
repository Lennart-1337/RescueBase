import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { TwoFactorMethod, UserRole } from "@rescuebase/domain";
import type { Request, Response } from "express";
import { AuditService } from "../services/audit.service.js";
import { MailService } from "../services/mail.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import { PublicRoute, RateLimit, Roles } from "../auth/auth.decorators.js";
import { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedRequest } from "../auth/auth.guard.js";
import { defaultTimezone } from "../settings/default-timezone.js";
import {
  defaultAppName,
  defaultAppSubtitle,
  defaultShowAppName,
  defaultShowAppSubtitle,
  defaultShowLogo
} from "../settings/settings.service.js";

type AdminUserListItem = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  twoFactorEnabled: boolean;
  twoFactorMethod?: TwoFactorMethod;
};

type AdminUserRecord = Omit<AdminUserListItem, "twoFactorMethod"> & {
  twoFactorMethod: TwoFactorMethod | null;
};

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly mail: MailService
  ) {}

  @PublicRoute()
  @RateLimit({ limit: 20, windowMs: 10 * 60 * 1000 })
  @Get("setup/status")
  async setupStatus(): Promise<{
    initialized: boolean;
    appName: string;
    appSubtitle: string;
    showLogo: boolean;
    showAppName: boolean;
    showAppSubtitle: boolean;
  }> {
    const firstAdmin = await this.prisma.user.findFirst({ where: { role: "ADMIN", deletedAt: null } });
    return { initialized: Boolean(firstAdmin), ...(await this.getBranding()) };
  }

  @PublicRoute()
  @RateLimit({ limit: 5, windowMs: 10 * 60 * 1000 })
  @Post("setup/first-admin")
  async createFirstAdmin(
    @Body() body: { email: string; displayName: string; password: string },
    @Res({ passthrough: true }) response: Response
  ): Promise<{ ok: true; userId: string; user: ReturnType<AuthService["toAuthenticatedUser"]> extends infer U ? U : never }> {
    const existingAdmin = await this.prisma.user.findFirst({ where: { role: "ADMIN", deletedAt: null } });
    if (existingAdmin) {
      throw new UnauthorizedException("Erstadmin ist bereits eingerichtet.");
    }
    this.assertPassword(body.password);

    const user = await this.prisma.user.create({
      data: {
        email: body.email.trim(),
        displayName: body.displayName.trim(),
        passwordHash: await this.auth.hashPassword(body.password),
        role: "ADMIN",
        twoFactorEnabled: false,
        twoFactorMethod: null,
        active: true
      }
    });
    await this.auth.createSession(response, user.id);
    await this.audit.record({
      actorType: "SYSTEM",
      actorLabel: "setup",
      action: "USER_CREATED",
      entityType: "User",
      entityId: user.id
    });

    return {
      ok: true,
      userId: user.id,
      user: this.auth.toAuthenticatedUser(user)
    };
  }

  @PublicRoute()
  @RateLimit({ limit: 10, windowMs: 10 * 60 * 1000 })
  @Post("login")
  async login(
    @Body() body: { email?: string; password?: string; twoFactorCode?: string; emailChallengeId?: string; loginChallengeId?: string },
    @Res({ passthrough: true }) response: Response
  ): Promise<{
    requiresTwoFactor: boolean;
    twoFactorMethod?: TwoFactorMethod;
    loginChallengeId?: string;
    emailChallengeId?: string;
    debugCode?: string;
    user?: ReturnType<AuthService["toAuthenticatedUser"]> extends infer U ? U : never;
  }> {
    if (body.loginChallengeId?.trim()) {
      const challenge = await this.auth.getPendingLoginChallenge(body.loginChallengeId);
      if (!challenge) {
        throw new UnauthorizedException("Die Anmeldung ist abgelaufen. Bitte melden Sie sich erneut an.");
      }
      if (!body.twoFactorCode?.trim()) {
        return { requiresTwoFactor: true, twoFactorMethod: challenge.method, loginChallengeId: body.loginChallengeId };
      }
      if (challenge.method === "TOTP" && !this.auth.verifyTotp(body.twoFactorCode, challenge.user.twoFactorSecret)) {
        throw new UnauthorizedException("2FA-Code ist ungültig.");
      }
      if (challenge.method === "EMAIL") {
        if (!challenge.emailChallengeId || !(await this.auth.verifyEmailTwoFactorChallenge(challenge.user.id, challenge.emailChallengeId, body.twoFactorCode))) {
          throw new UnauthorizedException("2FA-Code ist ungültig.");
        }
      }
      await this.auth.consumePendingLoginChallenge(challenge.id);
      await this.auth.createSession(response, challenge.user.id);
      return { requiresTwoFactor: false, user: this.auth.toAuthenticatedUser(challenge.user) };
    }

    const email = body.email?.trim();
    if (!email || !body.password) {
      throw new UnauthorizedException("E-Mail oder Passwort ist falsch.");
    }
    const user = await this.prisma.user.findFirst({ where: { email, active: true, deletedAt: null } });
    if (!user || !(await this.auth.verifyPassword(body.password, user.passwordHash))) {
      throw new UnauthorizedException("E-Mail oder Passwort ist falsch.");
    }

    if (user.twoFactorEnabled && user.twoFactorMethod === "TOTP") {
      if (!body.twoFactorCode?.trim() || !this.auth.verifyTotp(body.twoFactorCode, user.twoFactorSecret)) {
        if (!body.twoFactorCode?.trim()) {
          const loginChallenge = await this.auth.createPendingLoginChallenge(user.id, "TOTP");
          return { requiresTwoFactor: true, twoFactorMethod: "TOTP", loginChallengeId: loginChallenge.challengeId };
        }
        throw new UnauthorizedException("2FA-Code ist ungültig.");
      }
    }

    if (user.twoFactorEnabled && user.twoFactorMethod === "EMAIL") {
      if (body.emailChallengeId?.trim() && body.twoFactorCode?.trim()) {
        const valid = await this.auth.verifyEmailTwoFactorChallenge(user.id, body.emailChallengeId, body.twoFactorCode);
        if (!valid) {
          throw new UnauthorizedException("2FA-Code ist ungültig.");
        }
      } else {
        const challenge = await this.auth.createEmailTwoFactorChallenge(user.id);
        const delivery = await this.mail.sendEmailTwoFactorCode(user.email, challenge.code);
        const loginChallenge = await this.auth.createPendingLoginChallenge(user.id, "EMAIL", challenge.challengeId);
        return {
          requiresTwoFactor: true,
          twoFactorMethod: "EMAIL",
          loginChallengeId: loginChallenge.challengeId,
          emailChallengeId: challenge.challengeId,
          debugCode: delivery.debugCode
        };
      }
    }

    await this.auth.createSession(response, user.id);
    return {
      requiresTwoFactor: false,
      user: this.auth.toAuthenticatedUser(user)
    };
  }

  @PublicRoute()
  @RateLimit({ limit: 30, windowMs: 10 * 60 * 1000 })
  @Get("invitations/:token")
  async invitation(@Param("token") token: string): Promise<{
    email: string;
    displayName: string;
    role: UserRole;
  }> {
    const invitation = await this.auth.consumeInvitation(token);
    if (!invitation) {
      throw new UnauthorizedException("Einladung ist ungültig oder abgelaufen.");
    }
    return {
      email: invitation.email,
      displayName: invitation.displayName,
      role: invitation.role
    };
  }

  @PublicRoute()
  @RateLimit({ limit: 10, windowMs: 10 * 60 * 1000 })
  @Post("invitations/accept")
  async acceptInvitation(
    @Body() body: { token: string; password: string; displayName?: string },
    @Res({ passthrough: true }) response: Response
  ): Promise<{ ok: true; user: ReturnType<AuthService["toAuthenticatedUser"]> extends infer U ? U : never }> {
    this.assertPassword(body.password);
    const invitation = await this.auth.consumeInvitation(body.token);
    if (!invitation) {
      throw new UnauthorizedException("Einladung ist ungültig oder abgelaufen.");
    }

    const user = await this.prisma.user.update({
      where: { id: invitation.id },
      data: {
        displayName: body.displayName?.trim() || invitation.displayName,
        passwordHash: await this.auth.hashPassword(body.password),
        active: true
      }
    });
    await this.auth.markInvitationAccepted(invitation.invitationId);
    await this.auth.createSession(response, user.id);
    await this.audit.record({
      actorType: "PUBLIC_CHECKER",
      actorLabel: user.email,
      action: "USER_ACCEPTED_INVITATION",
      entityType: "User",
      entityId: user.id
    });

    return {
      ok: true,
      user: this.auth.toAuthenticatedUser(user)
    };
  }

  @PublicRoute()
  @RateLimit({ limit: 5, windowMs: 15 * 60 * 1000 })
  @Post("password-reset/request")
  async requestPasswordReset(@Body() body: { email: string }): Promise<{ ok: true; debugUrl?: string }> {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email.trim(), active: true, passwordHash: { not: null }, deletedAt: null }
    });
    if (!user) {
      return { ok: true };
    }

    const reset = await this.auth.createPasswordResetToken(user.id);
    const resetUrl = `${process.env.APP_PUBLIC_URL ?? "http://localhost:5173"}/password-reset/${reset.token}`;
    const delivery = await this.mail.sendPasswordReset(user.email, resetUrl);
    await this.audit.record({
      actorType: "SYSTEM",
      actorLabel: "RescueBase",
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "User",
      entityId: user.id
    });
    return { ok: true, debugUrl: delivery.debugUrl };
  }

  @PublicRoute()
  @RateLimit({ limit: 30, windowMs: 10 * 60 * 1000 })
  @Get("password-reset/:token")
  async passwordReset(@Param("token") token: string): Promise<{ email: string; displayName: string }> {
    const reset = await this.auth.getPasswordReset(token);
    if (!reset) {
      throw new UnauthorizedException("Passwort-Reset ist ungültig oder abgelaufen.");
    }
    return { email: reset.email, displayName: reset.displayName };
  }

  @PublicRoute()
  @RateLimit({ limit: 10, windowMs: 10 * 60 * 1000 })
  @Post("password-reset/confirm")
  async confirmPasswordReset(@Body() body: { token: string; password: string }): Promise<{ ok: true }> {
    this.assertPassword(body.password);
    const reset = await this.auth.getPasswordReset(body.token);
    if (!reset) {
      throw new UnauthorizedException("Passwort-Reset ist ungültig oder abgelaufen.");
    }

    await this.prisma.user.update({
      where: { id: reset.id },
      data: { passwordHash: await this.auth.hashPassword(body.password) }
    });
    await this.auth.consumePasswordReset(reset.resetId);
    await this.auth.destroyUserSessions(reset.id);
    await this.audit.record({
      actorType: "SYSTEM",
      actorLabel: "RescueBase",
      action: "PASSWORD_RESET_CONFIRMED",
      entityType: "User",
      entityId: reset.id
    });
    return { ok: true };
  }

  @Get("session")
  async session(@Req() request: AuthenticatedRequest): Promise<{
    user: AuthenticatedRequest["user"];
    appName: string;
    appSubtitle: string;
    showLogo: boolean;
    showAppName: boolean;
    showAppSubtitle: boolean;
  }> {
    if (!request.user) {
      throw new UnauthorizedException("Bitte melden Sie sich an.");
    }
    return { user: request.user, ...(await this.getBranding()) };
  }

  @Post("logout")
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<{ ok: true }> {
    await this.auth.destroySession(response, request.cookies?.rb_session);
    return { ok: true };
  }

  @Post("2fa/totp/setup")
  async setupTotp(@Req() request: AuthenticatedRequest): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: request.user?.id } });
    const setup = this.auth.createTwoFactorSetup(user);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: setup.secret, twoFactorEnabled: false, twoFactorMethod: null }
    });
    return setup;
  }

  @Post("2fa/totp/enable")
  @RateLimit({ limit: 10, windowMs: 10 * 60 * 1000 })
  async enableTotp(@Req() request: AuthenticatedRequest, @Body() body: { code: string }): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: request.user?.id } });
    if (!this.auth.verifyTotp(body.code, user.twoFactorSecret)) {
      throw new UnauthorizedException("2FA-Code ist ungültig.");
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true, twoFactorMethod: "TOTP" }
    });
    return { ok: true };
  }

  @Post("2fa/email/start")
  async startEmailTwoFactor(@Req() request: AuthenticatedRequest): Promise<{ challengeId: string; debugCode?: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: request.user?.id } });
    const challenge = await this.auth.createEmailTwoFactorChallenge(user.id);
    const delivery = await this.mail.sendEmailTwoFactorCode(user.email, challenge.code);
    return { challengeId: challenge.challengeId, debugCode: delivery.debugCode };
  }

  @Post("2fa/email/enable")
  @RateLimit({ limit: 10, windowMs: 10 * 60 * 1000 })
  async enableEmailTwoFactor(
    @Req() request: AuthenticatedRequest,
    @Body() body: { challengeId: string; code: string }
  ): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: request.user?.id } });
    const valid = await this.auth.verifyEmailTwoFactorChallenge(user.id, body.challengeId, body.code);
    if (!valid) {
      throw new UnauthorizedException("2FA-Code ist ungültig.");
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true, twoFactorMethod: "EMAIL", twoFactorSecret: null }
    });
    return { ok: true };
  }

  @Post("2fa/disable")
  async disableTwoFactor(@Req() request: AuthenticatedRequest): Promise<{ ok: true }> {
    await this.prisma.user.update({
      where: { id: request.user?.id },
      data: { twoFactorEnabled: false, twoFactorMethod: null, twoFactorSecret: null }
    });
    return { ok: true };
  }

  @Post("preferences/order-notifications")
  async updateOrderNotifications(
    @Req() request: AuthenticatedRequest,
    @Body() body: { enabled: boolean }
  ): Promise<{ ok: true; user: ReturnType<AuthService["toAuthenticatedUser"]> extends infer U ? U : never }> {
    if (typeof body.enabled !== "boolean") {
      throw new BadRequestException("Benachrichtigungsstatus muss gesetzt sein.");
    }
    const user = await this.prisma.user.update({
      where: { id: request.user?.id },
      data: { newOrderNotificationsEnabled: body.enabled }
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: request.user?.email ?? "Benutzer",
      action: "ORDER_NOTIFICATIONS_UPDATED",
      entityType: "User",
      entityId: user.id,
      payload: { enabled: body.enabled }
    });
    return { ok: true, user: this.auth.toAuthenticatedUser(user) };
  }

  @Roles("ADMIN")
  @Get("users")
  async users(): Promise<AdminUserListItem[]> {
    const users: AdminUserRecord[] = await this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: [{ role: "asc" }, { email: "asc" }]
    });
    return users.map((user): AdminUserListItem => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      active: user.active,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorMethod: user.twoFactorMethod ?? undefined
    }));
  }

  @Roles("ADMIN")
  @Post("users/:id/active")
  async setUserActive(@Param("id") id: string, @Body() body: { active: boolean }): Promise<{ ok: true }> {
    if (typeof body.active !== "boolean") {
      throw new BadRequestException("Aktiv-Status muss gesetzt sein.");
    }
    const existing = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException("Benutzerkonto nicht gefunden.");
    }
    const user = await this.prisma.user.update({
      where: { id: existing.id },
      data: { active: body.active }
    });
    if (!body.active) {
      await this.auth.destroyUserSessions(user.id);
    }
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: body.active ? "USER_REACTIVATED" : "USER_DEACTIVATED",
      entityType: "User",
      entityId: user.id
    });
    return { ok: true };
  }

  @Roles("ADMIN")
  @Delete("users/:id")
  async deleteUser(@Param("id") id: string, @Req() request: AuthenticatedRequest): Promise<{ ok: true }> {
    if (id === request.user?.id) {
      throw new BadRequestException("Das eigene Benutzerkonto kann nicht gelöscht werden.");
    }
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) {
      throw new NotFoundException("Benutzerkonto nicht gefunden.");
    }
    if (user.role === "ADMIN" && user.active) {
      const activeAdminCount = await this.prisma.user.count({ where: { role: "ADMIN", active: true, deletedAt: null } });
      if (activeAdminCount <= 1) {
        throw new BadRequestException("Das letzte aktive Adminkonto kann nicht gelöscht werden.");
      }
    }

    const deletedAt = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { active: false, deletedAt }
    });
    await this.auth.destroyUserSessions(user.id);
    await this.audit.record({
      actorType: "USER",
      actorLabel: request.user?.email ?? "Admin",
      action: "USER_DELETED",
      entityType: "User",
      entityId: user.id,
      payload: { email: user.email, deletedAt: deletedAt.toISOString() }
    });
    return { ok: true };
  }

  @Roles("ADMIN")
  @Post("invite")
  async invite(@Body() body: { email: string; role: UserRole; displayName: string }): Promise<{
    id: string;
    invitationUrl: string;
    debugUrl?: string;
  }> {
    const email = body.email.trim();
    const displayName = body.displayName.trim();
    if (!email || !displayName) {
      throw new BadRequestException("E-Mail und Anzeigename sind erforderlich.");
    }
    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) {
      throw new BadRequestException("Für diese E-Mail existiert bereits ein Benutzerkonto.");
    }

    const settings = await this.prisma.appSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton", timezone: defaultTimezone() } });
    const user = await this.prisma.user.create({
      data: {
        email,
        displayName,
        role: body.role,
        passwordHash: null,
        twoFactorEnabled: false,
        twoFactorMethod: null,
        active: false,
        newOrderNotificationsEnabled: settings.newUserOrderNotificationsDefaultEnabled
      }
    });
    const invitation = await this.auth.createInvitation(user.id);
    const invitationUrl = `${process.env.APP_PUBLIC_URL ?? "http://localhost:5173"}/invitation/${invitation.token}`;
    const delivery = await this.mail.sendInvitation(user.email, invitationUrl);
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "USER_INVITED",
      entityType: "User",
      entityId: user.id
    });
    return {
      id: user.id,
      invitationUrl,
      debugUrl: delivery.debugUrl
    };
  }

  private assertPassword(password: string): void {
    if (password.length < 12) {
      throw new BadRequestException("Passwort muss mindestens 12 Zeichen lang sein.");
    }
  }

  private async getBranding(): Promise<{
    appName: string;
    appSubtitle: string;
    showLogo: boolean;
    showAppName: boolean;
    showAppSubtitle: boolean;
  }> {
    const settings = await this.prisma.appSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: {
        id: "singleton",
        appName: defaultAppName,
        appSubtitle: defaultAppSubtitle,
        showLogo: defaultShowLogo,
        showAppName: defaultShowAppName,
        showAppSubtitle: defaultShowAppSubtitle,
        timezone: defaultTimezone()
      }
    });
    return {
      appName: settings.appName,
      appSubtitle: settings.appSubtitle,
      showLogo: settings.showLogo,
      showAppName: settings.showAppName,
      showAppSubtitle: settings.showAppSubtitle
    };
  }
}
