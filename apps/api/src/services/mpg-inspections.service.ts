import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../persistence/prisma.service.js";
import { audit, choice, date, isFutureCalendarDate, optional, optionalDate, revision, text, type Input } from "./mpg-validation.js";
@Injectable()
export class MpgInspectionsService {
  constructor(private readonly db: PrismaService) {}
  async save(deviceId: string, id: string | null, b: Input, actor: string, correctionOfId?: string) {
    return this.db.$transaction(async tx => {
      const device = await tx.medicalDevice.findUniqueOrThrow({ where: { id: deviceId } });
      if (device.retiredAt) throw new BadRequestException("Gerät ist außer Betrieb.");
      const old = id ? await tx.mpgInspection.findUniqueOrThrow({ where: { id } }) : null;
      if (old) { revision(old.version, b.version); if (old.finalizedAt) throw new BadRequestException("Abgeschlossene Nachweise sind unveränderlich."); }
      if (correctionOfId) {
        const original = await tx.mpgInspection.findUniqueOrThrow({ where: { id: correctionOfId } });
        if (!original.finalizedAt || original.deviceId !== deviceId) throw new BadRequestException("Ungültiger Ursprungsnachweis.");
      }
      const requirementId = text(b.requirementId, "Prüfanforderung");
      await tx.mpgRequirement.findFirstOrThrow({ where: { id: requirementId, modelId: device.mpgModelId ?? "", active: true } });
      const personId = optional(b.personId), externalCompany = optional(b.externalCompany);
      if (Boolean(personId) === Boolean(externalCompany)) throw new BadRequestException("Genau eine interne Person oder externe Firma angeben.");
      if (personId) await tx.mpgPerson.findFirstOrThrow({ where: { id: personId, active: true } });
      const reportDocumentId = optional(b.reportDocumentId);
      if (reportDocumentId) await tx.mpgDocument.findFirstOrThrow({ where: { id: reportDocumentId, OR: [{ deviceId }, ...(id ? [{ inspectionId: id }] : [])] } });
      const performedAt = date(b.performedAt), nextDueAt = optionalDate(b.nextDueAt);
      if (isFutureCalendarDate(performedAt) || (nextDueAt && nextDueAt <= performedAt)) throw new BadRequestException("Prüfdatum oder nächste Fälligkeit ungültig.");
      const data = { deviceId, requirementId, performedAt, nextDueAt, personId, externalCompany, reportDocumentId,
        qualification: optional(b.qualification), notes: optional(b.notes), result: choice(b.result, ["PASSED", "FAILED"]) };
      const result = old ? await tx.mpgInspection.update({ where: { id: old.id, version: old.version }, data: { ...data, version: { increment: 1 } } })
        : await tx.mpgInspection.create({ data: { ...data, correctionOfId, correctionReason: correctionOfId ? text(b.reason, "Berichtigungsgrund") : null } });
      await audit(tx, actor, "MedicalDevice", deviceId, "MPG_INSPECTION_DRAFT", result); return result;
    });
  }
  async update(id: string, b: Input, actor: string, correction = false) {
    const old = await this.db.mpgInspection.findUniqueOrThrow({ where: { id } });
    return this.save(old.deviceId, correction ? null : id, b, actor, correction ? id : undefined);
  }
  async finalize(id: string, b: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const i = await tx.mpgInspection.findUniqueOrThrow({ where: { id } }); revision(i.version, b.version);
      if (i.finalizedAt) throw new BadRequestException("Nachweis bereits abgeschlossen.");
      if (!i.reportDocumentId) throw new BadRequestException("Prüfbericht fehlt.");
      const result = await tx.mpgInspection.update({ where: { id, version: i.version }, data: { finalizedAt: new Date(), finalizedBy: actor, version: { increment: 1 } } });
      await audit(tx, actor, "MedicalDevice", i.deviceId, "MPG_INSPECTION_FINALIZED", result); return result;
    });
  }
}
