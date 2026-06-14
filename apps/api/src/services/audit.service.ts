import { Injectable } from "@nestjs/common";
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
        payload: toJsonPayload(input.payload)
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
        payload: toJsonPayload(input.payload)
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

function toJsonPayload(value: Record<string, unknown> | undefined) {
  return JSON.parse(JSON.stringify(value ?? {})) as never;
}
