import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../persistence/prisma.service.js";
import { audit, date, optional, optionalDate, revision, text, type Input } from "./mpg-validation.js";

@Injectable()
export class MpgPeopleService {
  constructor(private readonly db: PrismaService) {}
  list() { return this.db.mpgPerson.findMany({ include: { user: { select: { id: true, displayName: true, email: true } } }, orderBy: { name: "asc" } }); }
  userOptions() { return this.db.user.findMany({ where: { active: true, deletedAt: null },
    select: { id: true, displayName: true, email: true }, orderBy: { displayName: "asc" } }); }
  save(id: string | null, body: Input, actor: string) {
    return this.db.$transaction(async (tx) => {
      const old = id ? await tx.mpgPerson.findUniqueOrThrow({ where: { id } }) : null;
      if (old) revision(old.version, body.version);
      if ("internalCode" in body || "affiliation" in body) throw new BadRequestException("Interne Kennung und Zugehörigkeit werden nicht geführt.");
      const userId = optional(body.userId);
      if (userId) await tx.user.findFirstOrThrow({ where: { id: userId, deletedAt: null, active: true } });
      const qualificationDocumentId = optional(body.qualificationDocumentId);
      if (qualificationDocumentId) await tx.mpgDocument.findFirstOrThrow({ where: { id: qualificationDocumentId, personId: id ?? "" } });
      const instructorAuthorization = optional(body.instructorAuthorization);
      const instructorAuthorized = body.instructorAuthorized === true;
      if (instructorAuthorized && (!instructorAuthorization || !qualificationDocumentId)) throw new BadRequestException("Beauftragung und Qualifikationsnachweis müssen vollständig dokumentiert sein.");
      const birthDate = date(body.birthDate);
      if (birthDate >= new Date()) throw new BadRequestException("Geburtsdatum muss in der Vergangenheit liegen.");
      const data = { name: text(body.name, "Name"), birthDate, userId, active: body.active !== false, instructorAuthorized,
        instructorAuthorization, qualificationDocumentId, authorizationValidUntil: optionalDate(body.authorizationValidUntil) };
      const result = old ? await tx.mpgPerson.update({ where: { id: id!, version: old.version }, data: { ...data, version: { increment: 1 } } as Prisma.MpgPersonUncheckedUpdateInput }) : await tx.mpgPerson.create({ data: data as Prisma.MpgPersonUncheckedCreateInput });
      await audit(tx, actor, "MpgPerson", result.id, "MPG_PERSON_SAVED", { old, result });
      return result;
    });
  }
  async delete(id: string, actor: string) {
    return this.db.$transaction(async (tx) => {
      const person = await tx.mpgPerson.findUniqueOrThrow({ where: { id } });
      const used = await Promise.all([
        tx.mpgInspection.count({ where: { personId: id } }), tx.mpgGlucoseControl.count({ where: { personId: id } }),
        tx.mpgTraining.count({ where: { instructorId: id } }), tx.mpgTrainingConfirmation.count({ where: { personId: id } }),
        tx.mpgDocument.count({ where: { personId: id } }),
      ]);
      if (used.some(Boolean)) throw new BadRequestException("Personen mit Nachweisen können nur deaktiviert werden.");
      await tx.mpgPerson.delete({ where: { id } });
      await audit(tx, actor, "MpgPerson", id, "MPG_PERSON_DELETED", { person });
      return { deleted: true };
    });
  }
}
