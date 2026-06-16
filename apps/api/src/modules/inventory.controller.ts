import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuditService } from "../services/audit.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import { mapBatch, mapMovement, type BatchRecord, type MovementRecord } from "../persistence/mappers.js";
import { Roles } from "../auth/auth.decorators.js";

type InventoryBatchCorrectionTransaction = Pick<PrismaService, "batch" | "inventoryMovement" | "auditEvent">;

@ApiTags("Lager")
@Roles("ADMIN", "WAREHOUSE")
@Controller("inventory")
export class InventoryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  @Get("batches")
  async batches() {
    const batches = await this.prisma.batch.findMany({
      include: { article: true, location: true },
      orderBy: [{ article: { name: "asc" } }, { expiresAt: "asc" }]
    });
    return batches.map(mapBatch);
  }

  @Get("expiry-warnings")
  async expiryWarnings() {
    const warningLimit = new Date();
    warningLimit.setDate(warningLimit.getDate() + 90);

    const batches: BatchRecord[] = await this.prisma.batch.findMany({
      where: { expiresAt: { lte: warningLimit } },
      include: { article: true, location: true },
      orderBy: { expiresAt: "asc" }
    });
    return batches.map((batch: BatchRecord) => ({
      ...mapBatch(batch),
      severity: batch.expiresAt < new Date() ? "EXPIRED" : "EXPIRING_SOON"
    }));
  }

  @Post("batches")
  async createBatch(@Body() body: { articleId: string; locationId: string; lotNumber: string; expiresAt: string; quantity: number }) {
    const quantity = Math.trunc(body.quantity);
    const expiresAt = new Date(body.expiresAt);
    if (!body.articleId || !body.locationId || !body.lotNumber?.trim() || !Number.isFinite(quantity) || quantity < 0) {
      throw new BadRequestException("Artikel, Lagerort, Charge und Menge sind erforderlich.");
    }
    if (Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException("Ablaufdatum ist ungültig.");
    }

    const batch = await this.prisma.batch.create({
      data: {
        articleId: body.articleId,
        locationId: body.locationId,
        lotNumber: body.lotNumber.trim(),
        expiresAt,
        quantity
      },
      include: { article: true, location: true }
    });
    await this.prisma.inventoryMovement.create({
      data: {
        batchId: batch.id,
        articleId: batch.articleId,
        locationId: batch.locationId,
        type: "BATCH_CREATED",
        quantity: batch.quantity,
        actorLabel: "Lagerteam",
        reason: "Ersterfassung",
        metadata: {
          lotNumber: batch.lotNumber,
          expiresAt: body.expiresAt
        }
      }
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Lagerteam",
      action: "BATCH_CREATED",
      entityType: "Batch",
      entityId: batch.id,
      payload: batch
    });
    return mapBatch(batch);
  }

  @Get("batches/:id/movements")
  async movements(@Param("id") id: string) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundException("Charge nicht gefunden.");
    }
    const movements: MovementRecord[] = await this.prisma.inventoryMovement.findMany({
      where: { batchId: id },
      orderBy: { createdAt: "desc" }
    });
    return movements.map(mapMovement);
  }

  @Post("batches/:id/corrections")
  async correctBatch(
    @Param("id") id: string,
    @Body() body: { reason: string; quantity?: number; lotNumber?: string; expiresAt?: string; locationId?: string }
  ) {
    if (!body.reason?.trim()) {
      throw new BadRequestException("Eine Begründung ist erforderlich.");
    }
    const existing = await this.prisma.batch.findUnique({
      where: { id },
      include: { article: true, location: true }
    });
    if (!existing) {
      throw new NotFoundException("Charge nicht gefunden.");
    }

    const patch = this.normalizeCorrectionPatch(existing, body);
    if (patch.changes.length === 0) {
      throw new BadRequestException("Es wurde keine Änderung an der Charge angegeben.");
    }
    if (typeof patch.next.locationId === "string") {
      const location = await this.prisma.location.findUnique({ where: { id: patch.next.locationId } });
      if (!location) {
        throw new BadRequestException("Lagerort nicht gefunden.");
      }
    }

    const batch = await this.prisma.$transaction(async (tx: InventoryBatchCorrectionTransaction) => {
      const updated = await tx.batch.update({
        where: { id },
        data: patch.data,
        include: { article: true, location: true }
      });
      await tx.inventoryMovement.create({
        data: {
          batchId: updated.id,
          articleId: updated.articleId,
          locationId: updated.locationId,
          type: "BATCH_CORRECTION",
          quantity: patch.quantityDelta,
          actorLabel: "Lagerteam",
          reason: body.reason.trim(),
          metadata: {
            previous: patch.previous,
            next: patch.next
          }
        }
      });
      await this.audit.recordInTransaction(tx, {
        actorType: "USER",
        actorLabel: "Lagerteam",
        action: "BATCH_CORRECTED",
        entityType: "Batch",
        entityId: updated.id,
        payload: {
          reason: body.reason.trim(),
          previous: patch.previous,
          next: patch.next
        }
      });
      return updated;
    });

    return mapBatch(batch);
  }

  private normalizeCorrectionPatch(
    existing: BatchRecord,
    body: { quantity?: number; lotNumber?: string; expiresAt?: string; locationId?: string }
  ) {
    const data: Record<string, Date | number | string> = {};
    const previous: Record<string, string | number> = {};
    const next: Record<string, string | number> = {};
    const changes: string[] = [];

    if (body.quantity !== undefined) {
      const quantity = Math.trunc(body.quantity);
      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new BadRequestException("Die korrigierte Menge muss eine ganze Zahl ab 0 sein.");
      }
      if (quantity !== existing.quantity) {
        data.quantity = quantity;
        previous.quantity = existing.quantity;
        next.quantity = quantity;
        changes.push("quantity");
      }
    }

    if (body.lotNumber !== undefined) {
      const lotNumber = body.lotNumber.trim();
      if (!lotNumber) {
        throw new BadRequestException("Die Chargenkennzeichnung darf nicht leer sein.");
      }
      if (lotNumber !== existing.lotNumber) {
        data.lotNumber = lotNumber;
        previous.lotNumber = existing.lotNumber;
        next.lotNumber = lotNumber;
        changes.push("lotNumber");
      }
    }

    if (body.expiresAt !== undefined) {
      const expiresAt = new Date(body.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) {
        throw new BadRequestException("Ablaufdatum ist ungültig.");
      }
      const nextDate = expiresAt.toISOString().slice(0, 10);
      const previousDate = existing.expiresAt.toISOString().slice(0, 10);
      if (nextDate !== previousDate) {
        data.expiresAt = expiresAt;
        previous.expiresAt = previousDate;
        next.expiresAt = nextDate;
        changes.push("expiresAt");
      }
    }

    if (body.locationId !== undefined && body.locationId !== existing.locationId) {
      data.locationId = body.locationId;
      previous.locationId = existing.locationId;
      next.locationId = body.locationId;
      changes.push("locationId");
    }

    return {
      data,
      previous,
      next,
      changes,
      quantityDelta: typeof next.quantity === "number" ? Number(next.quantity) - existing.quantity : 0
    };
  }
}
