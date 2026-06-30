import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { applyFulfillment } from "@rescuebase/domain";
import type { ReplenishmentDraftItem, ReplenishmentStatus } from "@rescuebase/domain";
import { AuditService } from "../services/audit.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import { mapOrder, type OrderRecord } from "../persistence/mappers.js";
import { Roles } from "../auth/auth.decorators.js";

type ReplenishmentTransaction = Pick<
  PrismaService,
  "batch" | "inventoryMovement" | "replenishmentItem" | "replenishmentOrder" | "kit" | "auditEvent"
>;

type ReplenishmentOrderRecord = OrderRecord & {
  items: Array<OrderRecord["items"][number]>;
};

@ApiTags("Nachfüllaufträge")
@Roles("ADMIN", "WAREHOUSE")
@Controller("replenishment-orders")
export class ReplenishmentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  @Get()
  async list() {
    const orders = await this.prisma.replenishmentOrder.findMany({
      include: { items: true, kit: true },
      orderBy: { createdAt: "desc" }
    });
    return orders.map(mapOrder);
  }

  @Post(":id/fulfill")
  async fulfill(@Param("id") id: string, @Body() body: { items: Array<{ itemId: string; batchId: string; quantity: number }> }) {
    const order: ReplenishmentOrderRecord | null = await this.prisma.replenishmentOrder.findUnique({
      where: { id },
      include: { items: true, kit: true }
    });
    if (!order) {
      throw new NotFoundException("Nachfüllauftrag nicht gefunden.");
    }
    if (order.status === "DONE" || order.status === "CANCELLED") {
      throw new BadRequestException("Abgeschlossene Nachfüllaufträge können nicht gebucht werden.");
    }

    await this.validateFulfillment(order, body.items);
    const result = applyFulfillment(
      {
        id: order.id,
        status: order.status as ReplenishmentStatus,
        items: order.items.map((item: ReplenishmentOrderRecord["items"][number]) => ({
          ...item,
          reason: toReplenishmentReason(item.reason),
          neededQuantity: item.requestedQuantity
        }))
      },
      body.items.map((item) => ({ itemId: item.itemId, quantity: item.quantity }))
    );

    const updatedOrder = await this.prisma.$transaction(async (tx: ReplenishmentTransaction) => {
      for (const item of body.items) {
        const quantity = Math.trunc(item.quantity);
        if (quantity === 0) {
          continue;
        }
        const orderItem = order.items.find((entry: ReplenishmentOrderRecord["items"][number]) => entry.templatePositionId === item.itemId);
        if (!orderItem) {
          throw new BadRequestException("Auftragsposition nicht gefunden.");
        }
        const batch = await tx.batch.findFirst({ where: { id: item.batchId, deletedAt: null } });
        if (!batch) {
          throw new BadRequestException("Charge nicht gefunden.");
        }
        await tx.batch.update({
          where: { id: item.batchId },
          data: { quantity: { decrement: quantity } }
        });
        await tx.inventoryMovement.create({
          data: {
            batchId: batch.id,
            articleId: batch.articleId,
            locationId: batch.locationId,
            replenishmentOrderId: order.id,
            templatePositionId: item.itemId,
            type: "REPLENISHMENT_FULFILLMENT",
            quantity: -quantity,
            actorLabel: "Lagerteam",
            reason: orderItem.reason,
            metadata: {
              requestedQuantity: orderItem.requestedQuantity,
              fulfilledQuantity: quantity
            }
          }
        });
      }

      for (const item of result.order.items) {
        await tx.replenishmentItem.updateMany({
          where: { orderId: order.id, templatePositionId: item.templatePositionId },
          data: { fulfilledQuantity: item.fulfilledQuantity }
        });
      }
      await tx.replenishmentOrder.update({
        where: { id: order.id },
        data: { status: result.order.status }
      });

      await this.audit.recordInTransaction(tx, {
        actorType: "USER",
        actorLabel: "Lagerteam",
        action: "REPLENISHMENT_FULFILLED",
        entityType: "ReplenishmentOrder",
        entityId: order.id,
        payload: { completed: result.completed, remainingQuantity: result.remainingQuantity }
      });

      if (result.completed) {
        const hasOtherOpenOrder = await tx.replenishmentOrder.findFirst({
          where: {
            kitId: order.kitId,
            id: { not: order.id },
            status: "OPEN"
          }
        });
        if (!hasOtherOpenOrder) {
          await tx.kit.update({
            where: { id: order.kitId },
            data: { status: "READY" }
          });
          await this.audit.recordInTransaction(tx, {
            actorType: "SYSTEM",
            actorLabel: "RescueBase",
            action: "KIT_STATUS_READY_AFTER_REPLENISHMENT",
            entityType: "Kit",
            entityId: order.kitId,
            payload: { replenishmentOrderId: order.id }
          });
        }
      }

      return tx.replenishmentOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: true, kit: true }
      });
    });
    return { order: mapOrder(updatedOrder), completed: result.completed, remainingQuantity: result.remainingQuantity };
  }

  @Post(":id/cancel")
  async cancel(@Param("id") id: string) {
    const existingOrder = await this.prisma.replenishmentOrder.findUnique({
      where: { id },
      include: { items: true, kit: true }
    });
    if (!existingOrder) {
      throw new NotFoundException("Nachfüllauftrag nicht gefunden.");
    }
    if (existingOrder.status !== "OPEN") {
      throw new BadRequestException("Nur offene Nachfüllaufträge können storniert werden.");
    }
    const order = await this.prisma.replenishmentOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { items: true, kit: true }
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "REPLENISHMENT_CANCELLED",
      entityType: "ReplenishmentOrder",
      entityId: order.id
    });
    return mapOrder(order);
  }

  private async validateFulfillment(
    order: ReplenishmentOrderRecord,
    items: Array<{ itemId: string; batchId: string; quantity: number }>
  ) {
    for (const item of items) {
      const quantity = Math.trunc(item.quantity);
      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new BadRequestException("Nachfüllmenge muss eine positive ganze Zahl sein.");
      }
      if (quantity === 0) {
        continue;
      }

      const orderItem = order.items.find((entry: ReplenishmentOrderRecord["items"][number]) => entry.templatePositionId === item.itemId);
      if (!orderItem) {
        throw new BadRequestException("Auftragsposition nicht gefunden.");
      }
      const openQuantity = orderItem.requestedQuantity - orderItem.fulfilledQuantity;
      if (quantity > openQuantity) {
        throw new BadRequestException("Nachfüllmenge überschreitet die offene Menge.");
      }

      const batch = await this.prisma.batch.findFirst({ where: { id: item.batchId, deletedAt: null } });
      if (!batch) {
        throw new BadRequestException("Charge nicht gefunden.");
      }
      if (batch.articleId !== orderItem.articleId) {
        throw new BadRequestException("Charge passt nicht zur Auftragsposition.");
      }
      if (batch.quantity < quantity) {
        throw new BadRequestException("Charge enthält nicht genügend Bestand.");
      }
    }
  }
}

function toReplenishmentReason(reason: string): ReplenishmentDraftItem["reason"] {
  if (reason === "SHORTAGE" || reason === "DISCARDED_EXPIRED" || reason === "SHORTAGE_AND_DISCARDED_EXPIRED") {
    return reason;
  }
  throw new BadRequestException("Ungültiger Nachfüllgrund.");
}
