import { symmetricDecrypt } from "better-auth/crypto";
import { jest } from "@jest/globals";
import { migrateLegacyTwoFactor } from "../src/auth/legacy-two-factor-migration.js";

describe("legacy two-factor migration", () => {
  it("preserves TOTP secrets and keeps email 2FA on the OTP path", async () => {
    const created: Array<{ data: { secret: string; userId: string; verified: boolean } }> = [];
    const store = {
      user: { findMany: jest.fn().mockResolvedValue([
        { id: "totp-user", twoFactorMethod: "TOTP", twoFactorSecret: "totp-secret" },
        { id: "email-user", twoFactorMethod: "EMAIL", twoFactorSecret: null }
      ]) },
      twoFactor: { create: jest.fn(async (entry) => { created.push(entry); }) }
    };

    await migrateLegacyTwoFactor(store, "0123456789abcdef0123456789abcdef");

    expect(created.map((entry) => ({ userId: entry.data.userId, verified: entry.data.verified }))).toEqual([
      { userId: "totp-user", verified: true },
      { userId: "email-user", verified: false }
    ]);
    await expect(symmetricDecrypt({ data: created[0]!.data.secret, key: "0123456789abcdef0123456789abcdef" })).resolves.toBe("totp-secret");
  });
});
