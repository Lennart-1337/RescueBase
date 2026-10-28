import { jest } from "@jest/globals";
import type { PrismaService } from "../src/persistence/prisma.service.js";
import { updateBillingStatus } from "../src/services/service-planning/billing-status.js";
function harness(row: unknown = { id: "service", version: 2, status: "COMPLETED", offerSentAt: null, invoiceSentAt: null, invoicePaidAt: null }) {
  const tx = {
    serviceEvent: {
      findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(row),
      update: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    },
    auditEvent: { create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
  };
  const db = { $transaction: async (work: (value: typeof tx) => unknown) => work(tx) };
  return { tx, db: db as unknown as PrismaService };
}
const flags = { version: 2, offerSent: true, invoiceSent: true, invoicePaid: false };
describe("billing status", () => {
  it("records timestamps independently without reopening a completed service", async () => {
    const { tx, db } = harness();
    await updateBillingStatus(db, "service", flags, "actor");
    expect(tx.serviceEvent.update).toHaveBeenCalledWith({
      where: { id: "service", version: 2, deletedAt: null },
      data: { offerSentAt: expect.any(Date), invoiceSentAt: expect.any(Date), invoicePaidAt: null, version: { increment: 1 } },
    });
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });
  it("retains existing timestamps and clears unchecked milestones", async () => {
    const date = new Date("2026-10-01T12:00:00Z");
    const { tx, db } = harness({ id: "service", version: 2, offerSentAt: date, invoiceSentAt: date, invoicePaidAt: date });
    await updateBillingStatus(db, "service", flags, "actor");
    expect(tx.serviceEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: {
      offerSentAt: date, invoiceSentAt: date, invoicePaidAt: null, version: { increment: 1 },
    } }));
  });
  it("rejects missing and nonboolean flags, stale versions and deleted services", async () => {
    for (const body of [{ version: 2 }, { ...flags, invoicePaid: "false" }]) {
      await expect(updateBillingStatus(harness().db, "service", body, "actor")).rejects.toMatchObject({ status: 400 });
    }
    await expect(updateBillingStatus(harness().db, "service", { ...flags, version: 1 }, "actor")).rejects.toMatchObject({ status: 409 });
    await expect(updateBillingStatus(harness(null).db, "service", flags, "actor")).rejects.toMatchObject({ status: 404 });
  });
});
