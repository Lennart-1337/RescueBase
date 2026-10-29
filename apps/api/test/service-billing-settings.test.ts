import { jest } from "@jest/globals";
import { defaultBillingSettings } from "../src/settings/service-billing/defaults.js";
import { ServiceBillingSettingsService } from "../src/settings/service-billing/service.js";
import type { PrismaService } from "../src/persistence/prisma.service.js";
function harness() {
  let stored: { data: unknown; version: number } | null = null;
  const tx = {
    serviceBillingSettings: {
      findUnique: jest.fn(async () => stored),
      upsert: jest.fn(async () => {
        stored ??= { data: defaultBillingSettings, version: 0 };
        return stored;
      }),
      updateMany: jest.fn(
        async (args: {
          where: { version: number };
          data: { data: unknown };
        }) => {
          if (stored?.version !== args.where.version) return { count: 0 };
          stored = { data: args.data.data, version: stored.version + 1 };
          return { count: 1 };
        },
      ),
    },
    auditEvent: { create: jest.fn(async () => ({})) },
  };
  const db = {
    ...tx,
    $transaction: async (work: (db: typeof tx) => unknown) => work(tx),
  } as unknown as PrismaService;
  return { service: new ServiceBillingSettingsService(db), tx };
}
describe("service billing settings", () => {
  it("reads defaults without creating settings", async () => {
    const { service, tx } = harness();
    expect(await service.get()).toEqual({
      ...defaultBillingSettings,
      version: 0,
    });
    expect(tx.serviceBillingSettings.upsert).not.toHaveBeenCalled();
  });
  it("persists all validated settings and audit with a version increment", async () => {
    const { service, tx } = harness();
    const result = await service.update(
      {
        ...defaultBillingSettings,
        street: "Neue Straße 12",
        offerValidityDays: 21,
        version: 0,
      },
      "admin-id",
    );
    expect(result).toMatchObject({
      street: "Neue Straße 12",
      offerValidityDays: 21,
      version: 1,
    });
    expect(await service.get()).toEqual(result);
    expect(tx.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorLabel: "admin-id",
        action: "SERVICE_BILLING_SETTINGS_UPDATED",
        payload: expect.objectContaining({ previousVersion: 0, version: 1 }),
      }),
    });
  });
  it("rejects stale or incomplete writes without issuing a successful audit", async () => {
    const { service, tx } = harness();
    await expect(
      service.update({ ...defaultBillingSettings, version: 1 }, "admin-id"),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      service.update({ street: "Andere Straße", version: 0 }, "admin-id"),
    ).rejects.toMatchObject({ status: 400 });
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });
});
