import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { PrismaService } from "../../persistence/prisma.service.js";
import type { AuditService } from "../audit.service.js";
import { validateInventoryTargetBulk, type InventoryTargetChange } from "./validation.js";

const conflict = () => new ConflictException("Mindestbestände wurden zwischenzeitlich geändert. Bitte die Daten neu laden und Änderungen erneut prüfen.");

export async function updateInventoryTargets(prisma: PrismaService, audit: AuditService, body: unknown): Promise<void> {
  const { locationId, changes } = validateInventoryTargetBulk(body);
  const articleIds = changes.map((change) => change.articleId);
  try {
    await prisma.$transaction(async (tx) => {
      const location = await tx.location.findFirst({ where: { id: locationId, deletedAt: null }, select: { id: true } });
      if (!location) throw new BadRequestException("Lagerort nicht gefunden.");
      const articleCount = await tx.article.count({ where: { id: { in: articleIds }, deletedAt: null } });
      if (articleCount !== changes.length) throw new BadRequestException("Mindestens ein Artikel ist nicht mehr verfügbar.");
      const existing = await tx.inventoryTarget.findMany({ where: { locationId, articleId: { in: articleIds } } });
      const quantities = new Map(existing.map((target) => [target.articleId, target.targetQuantity]));
      for (const change of changes) {
        if ((quantities.get(change.articleId) ?? null) !== change.expectedTargetQuantity) throw conflict();
      }
      for (const change of changes) {
        await writeTarget(tx, locationId, change);
        await audit.recordInTransaction(tx, {
          actorType: "USER", actorLabel: "Lagerteam",
          action: change.targetQuantity === 0 ? "INVENTORY_TARGET_CLEARED" : "INVENTORY_TARGET_UPDATED",
          entityType: "InventoryTarget", entityId: `${change.articleId}:${locationId}`,
          payload: { locationId, ...change }
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && ["P2002", "P2034"].includes(String(error.code))) throw conflict();
    throw error;
  }
}

async function writeTarget(tx: Prisma.TransactionClient, locationId: string, change: InventoryTargetChange): Promise<void> {
  const { articleId, targetQuantity, expectedTargetQuantity } = change;
  const where = { articleId, locationId, targetQuantity: expectedTargetQuantity ?? undefined };
  if (targetQuantity === 0) {
    if (expectedTargetQuantity !== null) {
      const result = await tx.inventoryTarget.deleteMany({ where });
      if (result.count !== 1) throw conflict();
    }
    await tx.inventoryProcurementOrder.updateMany({
      where: { articleId, locationId, status: "OPEN" },
      data: { activeKey: null, status: "CANCELLED" }
    });
  } else if (expectedTargetQuantity === null) {
    await tx.inventoryTarget.create({ data: { articleId, locationId, targetQuantity } });
  } else {
    const result = await tx.inventoryTarget.updateMany({ where, data: { targetQuantity } });
    if (result.count !== 1) throw conflict();
  }
}
