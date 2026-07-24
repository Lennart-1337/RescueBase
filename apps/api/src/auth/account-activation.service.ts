import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { PrismaService } from "../persistence/prisma.service.js";

const ACTIVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AccountActivationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);
    await this.prisma.$transaction([
      this.prisma.accountActivation.deleteMany({ where: { userId, consumedAt: null } }),
      this.prisma.user.update({ where: { id: userId }, data: { activationRequired: true, active: false } }),
      this.prisma.accountActivation.create({ data: { userId, tokenHash: tokenHash(token), expiresAt } })
    ]);
    return { token, expiresAt };
  }

  async activate(token: string, password: string): Promise<string> {
    if (password.length < 12) throw new UnauthorizedException("Das Passwort muss mindestens 12 Zeichen haben.");
    const activation = await this.prisma.accountActivation.findUnique({ where: { tokenHash: tokenHash(token) } });
    if (!activation || activation.consumedAt || activation.expiresAt <= new Date()) throw new UnauthorizedException("Der Aktivierungslink ist ungültig oder abgelaufen.");
    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.accountActivation.updateMany({ where: { id: activation.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
      if (consumed.count !== 1) throw new UnauthorizedException("Der Aktivierungslink wurde bereits verwendet.");
      await tx.session.deleteMany({ where: { userId: activation.userId } });
      await tx.userSession.deleteMany({ where: { userId: activation.userId } });
      await tx.account.upsert({
        where: { providerId_accountId: { providerId: "credential", accountId: activation.userId } },
        create: { id: randomUUID(), userId: activation.userId, providerId: "credential", accountId: activation.userId, password: passwordHash },
        update: { password: passwordHash }
      });
      await tx.user.update({ where: { id: activation.userId }, data: { active: true, activationRequired: false, emailVerified: true, passwordHash: null, twoFactorEnabled: false, twoFactorMethod: null, twoFactorSecret: null } });
      await tx.twoFactor.deleteMany({ where: { userId: activation.userId } });
    });
    return activation.userId;
  }

  async isValid(token: string): Promise<boolean> {
    const activation = await this.prisma.accountActivation.findUnique({ where: { tokenHash: tokenHash(token) } });
    return Boolean(activation && !activation.consumedAt && activation.expiresAt > new Date());
  }
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
