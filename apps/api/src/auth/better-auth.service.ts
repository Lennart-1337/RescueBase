import { Injectable } from "@nestjs/common";
import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, twoFactor } from "better-auth/plugins";
import { PrismaService } from "../persistence/prisma.service.js";
import { MailService } from "../services/mail.service.js";

@Injectable()
export class BetterAuthService {
  readonly instance;

  constructor(prisma: PrismaService, mail: MailService) {
    this.instance = betterAuth({
      appName: "RescueBase",
      basePath: "/api/auth",
      baseURL: process.env.APP_PUBLIC_URL,
      secret: requiredSecret(),
      database: prismaAdapter(prisma, { provider: "mysql", transaction: true }),
      trustedOrigins: [process.env.APP_PUBLIC_URL ?? "http://localhost:5173"],
      user: {
        fields: { name: "displayName" },
        additionalFields: {
          active: { type: "boolean", input: false },
          activationRequired: { type: "boolean", input: false },
          newOrderNotificationsEnabled: { type: "boolean", input: false }
        },
        changeEmail: { enabled: true }
      },
      session: { expiresIn: 7 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
      emailAndPassword: {
        enabled: true,
        disableSignUp: true,
        requireEmailVerification: true,
        minPasswordLength: 12,
        resetPasswordTokenExpiresIn: 60 * 60,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async ({ user, url }) => { await mail.sendPasswordReset(user.email, url); }
      },
      emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        sendVerificationEmail: async ({ user, url }) => { await mail.sendEmailChangeConfirmation(user.email, url); }
      },
      rateLimit: { enabled: true, storage: "database" },
      plugins: [
        admin({ adminRoles: ["ADMIN"], defaultRole: "WAREHOUSE" }),
        twoFactor({
          issuer: "RescueBase",
          otpOptions: { sendOTP: async ({ user, otp }) => { await mail.sendEmailTwoFactorCode(user.email, otp); } },
          twoFactorCookieMaxAge: 10 * 60
        })
      ]
    });
  }
}

function requiredSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET muss mindestens 32 Zeichen haben.");
  return "rescuebase-development-secret-change-me";
}
