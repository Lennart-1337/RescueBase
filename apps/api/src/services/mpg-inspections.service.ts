import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../persistence/prisma.service.js";
import { inspectionDueDate, validateInspectionCompletion } from "./mpg-inspection-evidence.js";
import { audit, choice, date, isFutureCalendarDate, optional, revision, text, type Input } from "./mpg-validation.js";

@Injectable()
export class MpgInspectionsService {
  constructor(private readonly db: PrismaService) {}

  async save(deviceId: string, id: string | null, b: Input, actor: string, correctionOfId?: string) {
    return this.db.$transaction(async tx => {
      const device = await tx.mpgDevice.findUniqueOrThrow({ where: { id: deviceId } });
      if (device.retiredAt) throw new BadRequestException("Gerät ist außer Betrieb.");
      const old = id ? await tx.mpgInspection.findUniqueOrThrow({ where: { id } }) : null;
      if (old) { revision(old.version, b.version); if (old.finalizedAt) throw new BadRequestException("Abgeschlossene Nachweise sind unveränderlich."); }
      if (correctionOfId) {
        const original = await tx.mpgInspection.findUniqueOrThrow({ where: { id: correctionOfId } });
        if (!original.finalizedAt || original.deviceId !== deviceId) throw new BadRequestException("Ungültiger Ursprungsnachweis.");
      }
      const requirementId = text(b.requirementId, "Prüfanforderung");
      const requirement = await tx.mpgRequirement.findFirstOrThrow({ where: { id: requirementId, active: true,
        OR: [{ modelId: device.mpgModelId ?? "" }, { deviceId }] } });
      const personId = optional(b.personId), externalName = optional(b.externalName), externalCompany = optional(b.externalCompany);
      if ((personId && (externalName || externalCompany)) || (!personId && (!externalName || !externalCompany)))
        throw new BadRequestException("Genau eine interne Person oder externe Stelle mit Name und Firma angeben.");
      if (personId) await tx.mpgPerson.findFirstOrThrow({ where: { id: personId, active: true } });
      const reportDocumentId = optional(b.reportDocumentId);
      if (reportDocumentId) await tx.mpgDocument.findFirstOrThrow({ where: { id: reportDocumentId, OR: [{ deviceId }, ...(id ? [{ inspectionId: id }] : [])] } });
      const performedAt = date(b.performedAt);
      if (isFutureCalendarDate(performedAt)) throw new BadRequestException("Prüfdatum darf nicht in der Zukunft liegen.");
      const result = choice(b.result, ["PASSED", "FAILED"]);
      const nextDueReason = optional(b.nextDueReason), nextDueSource = optional(b.nextDueSource);
      const due = inspectionDueDate({ kind: requirement.kind, performedOn: performedAt.toISOString().slice(0, 10),
        intervalMonths: requirement.intervalMonths, requested: optional(b.nextDueAt), reason: nextDueReason, source: nextDueSource });
      const finalizeNow = b.finalize === true, completedAt = finalizeNow ? new Date() : null;
      if (finalizeNow) validateInspectionCompletion({ kind: requirement.kind, result, reportDocumentId,
        protocolConfirmed: b.protocolConfirmed === true, markingConfirmed: b.markingConfirmed === true });
      const technical = requirement.kind === "STK" || requirement.kind === "MTK";
      const data = { deviceId, requirementId, performedAt, nextDueAt: due ? new Date(`${due}T00:00:00.000Z`) : null,
        nextDueReason, nextDueSource, personId, externalName, externalCompany, reportDocumentId,
        qualification: optional(b.qualification), notes: optional(b.notes), result,
        finalizedAt: completedAt, finalizedBy: completedAt ? actor : null,
        protocolVerifiedAt: completedAt && technical ? completedAt : null,
        protocolVerifiedBy: completedAt && technical ? actor : null,
        markingConfirmedAt: completedAt && technical && result === "PASSED" ? completedAt : null,
        markingConfirmedBy: completedAt && technical && result === "PASSED" ? actor : null };
      const saved = old ? await tx.mpgInspection.update({ where: { id: old.id, version: old.version }, data: { ...data, version: { increment: 1 } } })
        : await tx.mpgInspection.create({ data: { ...data, correctionOfId, correctionReason: correctionOfId ? text(b.reason, "Berichtigungsgrund") : null } });
      await audit(tx, actor, "MpgDevice", deviceId, finalizeNow ? "MPG_INSPECTION_FINALIZED" : "MPG_INSPECTION_DRAFT", saved);
      return saved;
    });
  }

  async update(id: string, b: Input, actor: string, correction = false) {
    const old = await this.db.mpgInspection.findUniqueOrThrow({ where: { id } });
    return this.save(old.deviceId, correction ? null : id, b, actor, correction ? id : undefined);
  }

  async finalize(id: string, b: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const current = await tx.mpgInspection.findUniqueOrThrow({ where: { id }, include: { requirement: true } });
      revision(current.version, b.version);
      if (current.finalizedAt) throw new BadRequestException("Nachweis bereits abgeschlossen.");
      const reportDocumentId = optional(b.reportDocumentId) ?? current.reportDocumentId;
      if (reportDocumentId && reportDocumentId !== current.reportDocumentId) {
        await tx.mpgDocument.findFirstOrThrow({ where: { id: reportDocumentId, OR: [{ deviceId: current.deviceId }, { inspectionId: id }] } });
      }
      validateInspectionCompletion({ kind: current.requirement.kind, result: current.result,
        reportDocumentId, protocolConfirmed: b.protocolConfirmed === true,
        markingConfirmed: b.markingConfirmed === true });
      const technical = current.requirement.kind === "STK" || current.requirement.kind === "MTK", completedAt = new Date();
      const saved = await tx.mpgInspection.update({ where: { id, version: current.version }, data: {
        finalizedAt: completedAt, finalizedBy: actor, reportDocumentId, version: { increment: 1 },
        protocolVerifiedAt: technical ? completedAt : null, protocolVerifiedBy: technical ? actor : null,
        markingConfirmedAt: technical && current.result === "PASSED" ? completedAt : null,
        markingConfirmedBy: technical && current.result === "PASSED" ? actor : null } });
      await audit(tx, actor, "MpgDevice", current.deviceId, "MPG_INSPECTION_FINALIZED", saved);
      return saved;
    });
  }
}
