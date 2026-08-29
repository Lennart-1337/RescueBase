import { randomUUID } from "node:crypto";
import { symmetricEncrypt } from "better-auth/crypto";

type LegacyUser = { id: string; twoFactorMethod: "EMAIL" | "TOTP" | null; twoFactorSecret: string | null };

type LegacyTwoFactorStore = {
  user: {
    findMany: (args: {
      select: { id: true; twoFactorMethod: true; twoFactorSecret: true };
      where: { twoFactor: { is: null }; twoFactorEnabled: true };
    }) => Promise<LegacyUser[]>;
  };
  twoFactor: {
    create: (args: { data: { backupCodes: string; id: string; secret: string; userId: string; verified: boolean } }) => Promise<unknown>;
  };
};

export async function migrateLegacyTwoFactor(store: LegacyTwoFactorStore, secret: string): Promise<void> {
  const users = await store.user.findMany({
    where: { twoFactorEnabled: true, twoFactor: { is: null } },
    select: { id: true, twoFactorMethod: true, twoFactorSecret: true }
  });

  await Promise.all(users.map(async (user) => {
    const isTotp = user.twoFactorMethod === "TOTP" && Boolean(user.twoFactorSecret);
    const encryptedSecret = await symmetricEncrypt({ data: user.twoFactorSecret ?? "", key: secret });
    await store.twoFactor.create({
      data: { backupCodes: "[]", id: randomUUID(), secret: encryptedSecret, userId: user.id, verified: isTotp }
    });
  }));
}
