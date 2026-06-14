import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AuditActorType } from "@rescuebase/domain";
import { PrismaService } from "../persistence/prisma.service.js";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: {
    actorType: AuditActorType;
    actorLabel: string;
    action: string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    return this.prisma.auditEvent.create({
      data: {
        actorType: input.actorType,
        actorLabel: input.actorLabel,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue
      }
    }).then(() => undefined);
  }

  recordInTransaction(
    tx: Pick<PrismaService, "auditEvent">,
    input: {
      actorType: AuditActorType;
      actorLabel: string;
      action: string;
      entityType: string;
      entityId: string;
      payload?: Record<string, unknown>;
    }
  ): Promise<void> {
    return tx.auditEvent.create({
      data: {
        actorType: input.actorType,
        actorLabel: input.actorLabel,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue
      }
    }).then(() => undefined);
  }

  async list(filters: { entityType?: string; entityId?: string; action?: string }) {
    return this.prisma.auditEvent.findMany({
      where: {
        entityType: filters.entityType,
        entityId: filters.entityId,
        action: filters.action
      },
      orderBy: { createdAt: "desc" }
    });
  }
}
