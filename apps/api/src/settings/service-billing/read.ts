import type { Prisma } from "@prisma/client";
import type { PrismaService } from "../../persistence/prisma.service.js";
import {
  defaultBillingSettings,
  type BillingSettingsData,
} from "./defaults.js";
export type BillingSettings = BillingSettingsData & { version: number };
export async function readBillingSettings(
  db: PrismaService | Prisma.TransactionClient,
): Promise<BillingSettings> {
  const row = await db.serviceBillingSettings.findUnique({
    where: { id: "singleton" },
  });
  return {
    ...defaultBillingSettings,
    ...(row?.data as Partial<BillingSettingsData> | undefined),
    version: row?.version ?? 0,
  };
}
