import { jest } from "@jest/globals";
import { mkdtemp, readdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { PrismaService } from "../src/persistence/prisma.service.js";
import { ServiceBillingDocumentsService } from "../src/services/service-planning/billing/documents.service.js";
const body = {
  kind: "OFFER",
  number: "012-SAN-2026",
  issuedOn: "2026-10-29",
  recipient: "Testverein\nDöpperstraße 47\n47506 Neukirchen-Vluyn",
  version: 2,
};
function harness(status = "COMPLETED") {
  const row = {
    id: "service",
    version: 2,
    title: "Prüfdienst",
    status,
    pricingModel: "HOURLY",
    assignments: [],
    positions: [],
    lines: [],
    materialRate: "35",
    materialDiscounted: false,
    additionalCharges: [],
  };
  const tx = {
    serviceEvent: {
      findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(row),
      update: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    },
    serviceDocument: {
      create: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue({ id: "document" }),
    },
    auditEvent: {
      create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    },
  };
  return {
    tx,
    service: new ServiceBillingDocumentsService({
      $transaction: async (work: (value: typeof tx) => unknown) => work(tx),
    } as unknown as PrismaService),
  };
}
describe("persisted billing PDFs", () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "rescuebase-billing-"));
    process.env.SERVICE_DOCUMENT_DIR = directory;
  });
  afterEach(async () => {
    delete process.env.SERVICE_DOCUMENT_DIR;
    await rm(directory, { recursive: true, force: true });
  });
  it("archives PDF plus immutable snapshot, version and audit even for completed services", async () => {
    const { service, tx } = harness();
    const result = await service.create("service", body, "actor");
    expect(result.filename).toBe("Angebot-012-SAN-2026.pdf");
    expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
    const names = await readdir(directory);
    expect(names).toHaveLength(1);
    expect(await readFile(join(directory, names[0]!))).toEqual(result.buffer);
    expect(tx.serviceDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        billingKind: "OFFER",
        billingNumber: body.number,
        billingSnapshot: expect.objectContaining({
          validUntil: "2026-11-28",
          total: "35.00",
        }),
      }),
    });
    expect(tx.serviceEvent.update).toHaveBeenCalledWith({
      where: { id: "service", deletedAt: null, version: 2 },
      data: { version: { increment: 1 } },
    });
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });
  it("removes written files after duplicate number or transaction failure", async () => {
    const { service, tx } = harness();
    tx.serviceDocument.create.mockRejectedValueOnce(new Error("duplicate"));
    await expect(service.create("service", body, "actor")).rejects.toThrow(
      "duplicate",
    );
    expect(await readdir(directory)).toEqual([]);
  });
  it("refuses stale revisions, cancelled and missing services before writing", async () => {
    await expect(
      harness().service.create("service", { ...body, version: 1 }, "actor"),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      harness("CANCELLED").service.create("service", body, "actor"),
    ).rejects.toMatchObject({ status: 400 });
    const { service, tx } = harness();
    tx.serviceEvent.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.create("service", body, "actor"),
    ).rejects.toMatchObject({ status: 404 });
    expect(await readdir(directory)).toEqual([]);
  });
});
