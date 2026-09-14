import { Injectable } from "@nestjs/common";
import { PrismaService } from "../persistence/prisma.service.js";
import { audit, optional, revision, text, type Input } from "./mpg-validation.js";
@Injectable()
export class MpgPeopleService {
  constructor(private readonly db: PrismaService) {}
  list() { return this.db.mpgPerson.findMany({ orderBy: { name: "asc" } }); }
  save(id: string | null, b: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const old = id ? await tx.mpgPerson.findUniqueOrThrow({ where: { id } }) : null;
      if (old) revision(old.version, b.version);
      const userId = optional(b.userId);
      if (userId) await tx.user.findFirstOrThrow({ where: { id: userId, deletedAt: null, active: true } });
      const qualificationDocumentId = optional(b.qualificationDocumentId);
      if (qualificationDocumentId) await tx.mpgDocument.findFirstOrThrow({ where: { id: qualificationDocumentId, personId: id } });
      const data = { name: text(b.name, "Name"), internalCode: text(b.internalCode, "Interne Kennung"), affiliation: text(b.affiliation, "Zugehörigkeit"),
        userId, active: b.active !== false, instructorAuthorization: optional(b.instructorAuthorization), qualificationDocumentId };
      const result = id ? await tx.mpgPerson.update({ where: { id, version: old!.version }, data: { ...data, version: { increment: 1 } } }) : await tx.mpgPerson.create({ data });
      await audit(tx, actor, "MpgPerson", result.id, "MPG_PERSON_SAVED", { old, result }); return result;
    });
  }
}
