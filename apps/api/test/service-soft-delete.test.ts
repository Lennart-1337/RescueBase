import { jest } from "@jest/globals";
import { ServiceEventsService } from "../src/services/service-planning/events.service.js";
import { ServiceDocumentsService } from "../src/services/service-planning/documents.service.js";
import { serviceFilter } from "../src/services/service-planning/query.js";
import type { PrismaService } from "../src/persistence/prisma.service.js";
function harness(row: unknown = { id: "service", version: 3, deletedAt: null }) {
  const tx = {
    serviceEvent: {
      findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(row),
      update: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: "service", version: 4, deletedAt: new Date() }),
    },
    serviceDocument: { findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(null) },
    auditEvent: { create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
  };
  const db = { ...tx, $transaction: async (work: (value: typeof tx) => unknown) => work(tx) };
  return { tx, events: new ServiceEventsService(db as unknown as PrismaService), docs: new ServiceDocumentsService(db as unknown as PrismaService) };
}
describe("service soft deletion", () => {
  it("always filters deleted services from list and statistics queries", () => {
    expect(serviceFilter({})).toMatchObject({ deletedAt: null });
    expect(serviceFilter({ search: "Test", status: "COMPLETED" })).toMatchObject({ deletedAt: null });
  });
  it("retains data while recording deletion and incrementing the version", async () => {
    const { events, tx } = harness();
    const result = await events.remove("service", { version: 3 }, "actor");
    expect(tx.serviceEvent.update).toHaveBeenCalledWith({
      where: { id: "service", version: 3, deletedAt: null },
      data: { deletedAt: expect.any(Date), version: { increment: 1 } },
      select: { id: true, deletedAt: true, version: true },
    });
    expect(result).toMatchObject({ id: "service", version: 4 });
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });
  it("rejects stale versions and repeated deletion", async () => {
    const stale = harness();
    await expect(stale.events.remove("service", { version: 2 }, "actor")).rejects.toMatchObject({ status: 409 });
    expect(stale.tx.serviceEvent.update).not.toHaveBeenCalled();
    await expect(harness(null).events.remove("service", { version: 3 }, "actor")).rejects.toMatchObject({ status: 404 });
  });
  it("blocks direct service and attachment access after deletion", async () => {
    const { events, docs, tx } = harness(null);
    await expect(events.detail("service")).rejects.toMatchObject({ status: 404 });
    expect(tx.serviceEvent.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "service", deletedAt: null } }));
    await expect(docs.read("service", "document")).rejects.toMatchObject({ status: 404 });
    expect(tx.serviceDocument.findFirst).toHaveBeenCalledWith({ where: { id: "document", serviceId: "service", service: { deletedAt: null } } });
  });
});
