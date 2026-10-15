import { jest } from "@jest/globals";
import { BadRequestException, ConflictException } from "@nestjs/common";
import type { PrismaService } from "../src/persistence/prisma.service.js";
import type { AuditService } from "../src/services/audit.service.js";
import { updateInventoryTargets } from "../src/services/inventory-targets/bulk-update.js";

function setup() {
  const tx = {
    article: { count: jest.fn<() => Promise<number>>().mockResolvedValue(2) },
    location: { findFirst: jest.fn<() => Promise<object | null>>().mockResolvedValue({ id: "location" }) },
    inventoryTarget: {
      findMany: jest.fn<() => Promise<object[]>>().mockResolvedValue([{ articleId: "a", targetQuantity: 5 }]),
      create: jest.fn<() => Promise<object>>().mockResolvedValue({}),
      updateMany: jest.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: 1 })
    },
    inventoryProcurementOrder: { updateMany: jest.fn<() => Promise<object>>().mockResolvedValue({}) }
  };
  const transaction = jest.fn<(action: (tx: unknown) => Promise<void>) => Promise<void>>().mockImplementation(async (action) => action(tx));
  const prisma = { $transaction: transaction } as unknown as PrismaService;
  const recordInTransaction = jest.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
  const audit = { recordInTransaction } as unknown as AuditService;
  const input = { locationId: "location", changes: [
    { articleId: "a", targetQuantity: 0, expectedTargetQuantity: 5 as number | null },
    { articleId: "b", targetQuantity: 12, expectedTargetQuantity: null as number | null }
  ] };
  return { tx, prisma, audit, transaction, recordInTransaction, input };
}

describe("atomic inventory target updates", () => {
  it.each([null, {}, { locationId: "location", changes: [] }, { locationId: 12, changes: [] }])("rejects malformed request %p", async (body) => {
    const { prisma, audit, transaction } = setup();
    await expect(updateInventoryTargets(prisma, audit, body)).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
  it.each([-1, 1.5, NaN, Infinity, 2147483648, "12", null])("rejects invalid quantities %p before writing", async (quantity) => {
    const { prisma, audit, transaction, input } = setup();
    await expect(updateInventoryTargets(prisma, audit, { ...input, changes: [{ ...input.changes[0], targetQuantity: quantity }] })).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
  it("rejects duplicate articles and missing snapshot values", async () => {
    const { prisma, audit, input } = setup();
    await expect(updateInventoryTargets(prisma, audit, { ...input, changes: [input.changes[0], input.changes[0]] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(updateInventoryTargets(prisma, audit, { ...input, changes: [{ articleId: "a", targetQuantity: 2 }] })).rejects.toBeInstanceOf(BadRequestException);
  });
  it("removes targets, cancels only OPEN orders and creates targets in the audited transaction", async () => {
    const { prisma, audit, tx, input, recordInTransaction } = setup();
    await updateInventoryTargets(prisma, audit, input);
    expect(tx.inventoryTarget.deleteMany).toHaveBeenCalledWith({ where: { articleId: "a", locationId: "location", targetQuantity: 5 } });
    expect(tx.inventoryTarget.create).toHaveBeenCalledWith({ data: { articleId: "b", locationId: "location", targetQuantity: 12 } });
    expect(tx.inventoryProcurementOrder.updateMany).toHaveBeenCalledWith({ where: { articleId: "a", locationId: "location", status: "OPEN" }, data: { activeKey: null, status: "CANCELLED" } });
    expect(recordInTransaction).toHaveBeenCalledTimes(2);
    expect(recordInTransaction.mock.calls[0][0]).toBe(tx);
  });
  it("checks all snapshots before any writes", async () => {
    const { prisma, audit, tx, input } = setup();
    input.changes[1].expectedTargetQuantity = 9;
    await expect(updateInventoryTargets(prisma, audit, input)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.inventoryTarget.deleteMany).not.toHaveBeenCalled();
  });
  it("guards updates against concurrent quantity changes", async () => {
    const { prisma, audit, tx, input } = setup();
    tx.article.count.mockResolvedValue(1);
    tx.inventoryTarget.updateMany.mockResolvedValue({ count: 0 });
    await expect(updateInventoryTargets(prisma, audit, { ...input, changes: [{ articleId: "a", targetQuantity: 9, expectedTargetQuantity: 5 }] })).rejects.toBeInstanceOf(ConflictException);
  });
  it("guards deletion against concurrent quantity changes", async () => {
    const { prisma, audit, tx, input } = setup();
    tx.inventoryTarget.deleteMany.mockResolvedValue({ count: 0 });
    await expect(updateInventoryTargets(prisma, audit, input)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.inventoryProcurementOrder.updateMany).not.toHaveBeenCalled();
  });
  it("accepts a zero minimum for an absent target without creating it", async () => {
    const { prisma, audit, tx, input } = setup();
    tx.article.count.mockResolvedValue(1);
    tx.inventoryTarget.findMany.mockResolvedValue([]);
    await updateInventoryTargets(prisma, audit, { ...input, changes: [{ articleId: "b", targetQuantity: 0, expectedTargetQuantity: null }] });
    expect(tx.inventoryTarget.create).not.toHaveBeenCalled();
    expect(tx.inventoryTarget.deleteMany).not.toHaveBeenCalled();
  });
  it.each(["P2002", "P2034"])("maps transaction race %s to conflict", async (code) => {
    const { prisma, audit, transaction, input } = setup();
    transaction.mockRejectedValue({ code });
    await expect(updateInventoryTargets(prisma, audit, input)).rejects.toBeInstanceOf(ConflictException);
  });
  it("rejects deleted or unknown article and location references", async () => {
    const { prisma, audit, tx, input } = setup();
    tx.article.count.mockResolvedValue(1);
    await expect(updateInventoryTargets(prisma, audit, input)).rejects.toBeInstanceOf(BadRequestException);
    tx.article.count.mockResolvedValue(2);
    tx.location.findFirst.mockResolvedValue(null);
    await expect(updateInventoryTargets(prisma, audit, input)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.inventoryTarget.deleteMany).not.toHaveBeenCalled();
  });
});
