import { BadRequestException, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../persistence/prisma.service.js";
import { audit, choice, date, isFutureCalendarDate, optional, revision, text, type Input } from "./mpg-validation.js";
@Injectable()
export class MpgTrainingsService {
  constructor(private readonly db: PrismaService) {}
  list() { return this.db.mpgTraining.findMany({ include: { confirmations: true }, orderBy: { performedAt: "desc" } }); }
  get(id: string) { return this.db.mpgTraining.findUniqueOrThrow({ where: { id }, include: { confirmations: true } }); }
  create(b: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const modelId = text(b.modelId, "Modell"), deviceId = optional(b.deviceId), instructorId = text(b.instructorId, "Einweisende Person");
      await tx.mpgModel.findUniqueOrThrow({ where: { id: modelId } });
      if (deviceId) await tx.medicalDevice.findFirstOrThrow({ where: { id: deviceId, mpgModelId: modelId } });
      const instructor = await tx.mpgPerson.findFirstOrThrow({ where: { id: instructorId, active: true } });
      if (!instructor.instructorAuthorization) throw new BadRequestException("Beauftragung der einweisenden Person fehlt.");
      const documentId = text(b.documentId, "Dokumentversion");
      await tx.mpgDocument.findFirstOrThrow({ where: { id: documentId, OR: [{ modelId }, ...(deviceId ? [{ deviceId }] : [])] } });
      if (!Array.isArray(b.participantIds) || !b.participantIds.length) throw new BadRequestException("Teilnehmer fehlen.");
      const participantIds = [...new Set(b.participantIds.map(p => text(p, "Teilnehmer")))];
      const participants = await tx.mpgPerson.findMany({ where: { id: { in: participantIds }, active: true } });
      if (participants.length !== participantIds.length) throw new BadRequestException("Teilnehmer fehlen oder sind inaktiv.");
      const performedAt = date(b.performedAt); if (isFutureCalendarDate(performedAt)) throw new BadRequestException("Einweisungsdatum liegt in der Zukunft.");
      const correctionOfId = optional(b.correctionOfId);
      if (correctionOfId) await tx.mpgTraining.findFirstOrThrow({ where: { id: correctionOfId, finalizedAt: { not: null } } });
      const result = await tx.mpgTraining.create({ data: { modelId, deviceId, instructorId, documentId, performedAt,
        scope: text(b.scope, "Geltungsbereich"), contents: text(b.contents, "Inhalte"), correctionOfId,
        correctionReason: correctionOfId ? text(b.reason, "Berichtigungsgrund") : null,
        confirmations: { create: [{ personId: instructor.id, role: "INSTRUCTOR", nameSnapshot: instructor.name, confirmationText: "" },
          ...participants.map(p => ({ personId: p.id, role: "PARTICIPANT", nameSnapshot: p.name, confirmationText: "" }))] } }, include: { confirmations: true } });
      await audit(tx, actor, "MpgTraining", result.id, "MPG_TRAINING_CREATED", result); return result;
    });
  }
  confirm(id: string, b: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const training = await tx.mpgTraining.findUniqueOrThrow({ where: { id } }); revision(training.version, b.version);
      if (training.finalizedAt) throw new BadRequestException("Nachweis ist abgeschlossen.");
      const role = choice(b.role, ["INSTRUCTOR", "PARTICIPANT"]), personId = text(b.personId, "Person");
      const confirmation = await tx.mpgTrainingConfirmation.findUniqueOrThrow({ where: { trainingId_personId_role: { trainingId: id, personId, role } } });
      if (confirmation.confirmedAt) throw new BadRequestException("Bestätigung bereits unveränderlich gespeichert.");
      const signature = text(b.signaturePngDataUrl, "Unterschrift");
      if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) || signature.length > 1_000_000 ||
          !Buffer.from(signature.split(",")[1] ?? "", "base64").subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new BadRequestException("Ungültige PNG-Unterschrift.");
      const result = await tx.mpgTrainingConfirmation.update({ where: { id: confirmation.id }, data: { signaturePngDataUrl: signature,
        signatureHash: createHash("sha256").update(signature).digest("hex"), confirmationText: text(b.confirmationText, "Bestätigungstext"), confirmedAt: new Date(), confirmedBy: actor } });
      await tx.mpgTraining.update({ where: { id, version: training.version }, data: { version: { increment: 1 } } });
      await audit(tx, actor, "MpgTraining", id, "MPG_TRAINING_CONFIRMED", { confirmationId: result.id, signatureHash: result.signatureHash }); return this.getWith(tx, id);
    });
  }
  finalize(id: string, b: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const t = await tx.mpgTraining.findUniqueOrThrow({ where: { id }, include: { confirmations: true } }); revision(t.version, b.version);
      if (t.finalizedAt || !t.confirmations.length || t.confirmations.some(c => !c.confirmedAt)) throw new BadRequestException("Alle Beteiligten müssen separat bestätigen.");
      const result = await tx.mpgTraining.update({ where: { id, version: t.version }, data: { finalizedAt: new Date(), finalizedBy: actor, version: { increment: 1 } }, include: { confirmations: true } });
      await audit(tx, actor, "MpgTraining", id, "MPG_TRAINING_FINALIZED", { id }); return result;
    });
  }
  private getWith(tx: import("@prisma/client").Prisma.TransactionClient, id: string) { return tx.mpgTraining.findUniqueOrThrow({ where: { id }, include: { confirmations: true } }); }
}
