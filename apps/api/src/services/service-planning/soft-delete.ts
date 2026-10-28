import { NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../../persistence/prisma.service.js";
import { audit, revision } from "../mpg-validation.js";
import { object, type Input } from "./input.js";
import { rethrowConflict } from "./persistence.js";
export async function removeService(db: PrismaService, id: string, body: Input, actor: string) {
  body = object(body);
  try {
    return await db.$transaction(async (tx) => {
      const old = await tx.serviceEvent.findUnique({ where: { id, deletedAt: null } });
      if (!old) throw new NotFoundException("Dienst nicht gefunden.");
      revision(old.version, body.version);
      const result = await tx.serviceEvent.update({
        where: { id, version: old.version, deletedAt: null },
        data: { deletedAt: new Date(), version: { increment: 1 } },
        select: { id: true, deletedAt: true, version: true },
      });
      await audit(tx, actor, "ServiceEvent", id, "SERVICE_DELETED", {
        previousVersion: old.version, version: result.version, deletedAt: result.deletedAt,
      });
      return result;
    });
  } catch (error) {
    rethrowConflict(error);
  }
}
