import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../../persistence/prisma.service.js";
import { audit, revision } from "../mpg-validation.js";
import { object, type Input } from "./input.js";
import { rethrowConflict } from "./persistence.js";
const flags = ["offerSent", "invoiceSent", "invoicePaid"] as const;
export async function updateBillingStatus(db: PrismaService, id: string, body: Input, actor: string) {
  body = object(body);
  for (const key of flags)
    if (typeof body[key] !== "boolean")
      throw new BadRequestException("Angebots-, Rechnungs- und Zahlungsstatus müssen angegeben werden.");
  try {
    await db.$transaction(async (tx) => {
      const old = await tx.serviceEvent.findUnique({ where: { id, deletedAt: null } });
      if (!old) throw new NotFoundException("Dienst nicht gefunden.");
      revision(old.version, body.version);
      const now = new Date();
      const data = {
        offerSentAt: body.offerSent ? old.offerSentAt ?? now : null,
        invoiceSentAt: body.invoiceSent ? old.invoiceSentAt ?? now : null,
        invoicePaidAt: body.invoicePaid ? old.invoicePaidAt ?? now : null,
      };
      await tx.serviceEvent.update({
        where: { id, version: old.version, deletedAt: null },
        data: { ...data, version: { increment: 1 } },
      });
      await audit(tx, actor, "ServiceEvent", id, "SERVICE_BILLING_STATUS_CHANGED", {
        previousVersion: old.version, version: old.version + 1,
        before: { offerSentAt: old.offerSentAt, invoiceSentAt: old.invoiceSentAt, invoicePaidAt: old.invoicePaidAt },
        after: data,
      });
    });
  } catch (error) {
    rethrowConflict(error);
  }
}
