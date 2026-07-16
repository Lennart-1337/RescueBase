import type { ExecutionContext } from "@nestjs/common";
import { HttpException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { generateSecret, generateSync } from "otplib";
import { AuthService } from "../src/auth/auth.service";
import { RateLimitGuard } from "../src/auth/rate-limit.guard";
import { RateLimitService } from "../src/auth/rate-limit.service";
import type { PrismaService } from "../src/persistence/prisma.service";

describe("auth security", () => {
  it("accepts a TOTP generated in the adjacent 30-second time step", () => {
    const auth = new AuthService({} as PrismaService);
    const secret = generateSecret();
    const code = generateSync({ secret, epoch: 1_800_000_000 });

    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1_800_000_030_000);
    try {
      expect(auth.verifyTotp(code, secret)).toBe(true);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("does not consume an email 2FA challenge for a different user", async () => {
    const prisma = {
      emailTwoFactorChallenge: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn()
      }
    };
    const auth = new AuthService(prisma as unknown as PrismaService);
    prisma.emailTwoFactorChallenge.findUnique.mockResolvedValue({
      id: "challenge-1",
      userId: "other-user",
      codeHash: auth.hashOpaqueToken("123456"),
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000)
    });

    await expect(auth.verifyEmailTwoFactorChallenge("target-user", "challenge-1", "123456")).resolves.toBe(false);
    expect(prisma.emailTwoFactorChallenge.updateMany).not.toHaveBeenCalled();
  });

  it("consumes an email 2FA challenge only for the matching user", async () => {
    const prisma = {
      emailTwoFactorChallenge: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn()
      }
    };
    const auth = new AuthService(prisma as unknown as PrismaService);
    prisma.emailTwoFactorChallenge.findUnique.mockResolvedValue({
      id: "challenge-1",
      userId: "target-user",
      codeHash: auth.hashOpaqueToken("123456"),
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000)
    });

    prisma.emailTwoFactorChallenge.updateMany.mockResolvedValue({ count: 1 });
    await expect(auth.verifyEmailTwoFactorChallenge("target-user", "challenge-1", "123456")).resolves.toBe(true);
    expect(prisma.emailTwoFactorChallenge.updateMany).toHaveBeenCalled();
  });

  it("rate-limits repeated attempts for the same route and identity", () => {
    const guard = new RateLimitGuard(
      { getAllAndOverride: () => ({ limit: 2, windowMs: 60_000 }) } as never,
      new RateLimitService()
    );
    const context = loginContext("lager@rescuebase.local");

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });
});

function loginContext(email: string): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        method: "POST",
        path: "/auth/login",
        ip: "127.0.0.1",
        body: { email },
        socket: {}
      })
    })
  } as unknown as ExecutionContext;
}
