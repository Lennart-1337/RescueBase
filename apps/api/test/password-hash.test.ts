import { hash as hashLegacyPassword } from "bcryptjs";
import { hashPassword as hashBetterAuthPassword } from "better-auth/crypto";
import { hashPassword, verifyPassword } from "../src/auth/password-hash.js";

describe("password hashes", () => {
  it("verifies legacy bcrypt and Better Auth password hashes", async () => {
    const password = "rescuebase-password";
    const legacyHash = await hashLegacyPassword(password, 4);
    const betterAuthHash = await hashBetterAuthPassword(password);

    await expect(verifyPassword(password, legacyHash)).resolves.toBe(true);
    await expect(verifyPassword(password, betterAuthHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", legacyHash)).resolves.toBe(false);
  });

  it("creates bcrypt hashes for new passwords", async () => {
    const password = "rescuebase-password";
    await expect(verifyPassword(password, await hashPassword(password))).resolves.toBe(true);
  });
});
