import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../persistence/prisma.service.js";
import { audit, choice, integer, optional, optionalDate, revision, text, type Input } from "./mpg-validation.js";
@Injectable()
export class MpgModelsService {
  constructor(private readonly db: PrismaService) {}
  list() { return this.db.mpgModel.findMany({ include: { requirements: true }, orderBy: { name: "asc" } }); }
  async save(id: string | null, b: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const old = id ? await tx.mpgModel.findUniqueOrThrow({ where: { id } }) : null;
      if (old) revision(old.version, b.version);
      const instructionsDocumentId = optional(b.instructionsDocumentId);
      if (instructionsDocumentId) await tx.mpgDocument.findFirstOrThrow({ where: { id: instructionsDocumentId, modelId: id } });
      const data = { name: text(b.name ?? old?.name, "Modell"), manufacturer: text(b.manufacturer ?? old?.manufacturer, "Hersteller"),
        manufacturerAddress: text(b.manufacturerAddress ?? old?.manufacturerAddress, "Herstelleranschrift"), productType: text(b.productType ?? old?.productType, "Produktart"),
        instructionsDocumentId: b.instructionsDocumentId === undefined ? old?.instructionsDocumentId ?? null : instructionsDocumentId };
      const model = id ? await tx.mpgModel.update({ where: { id, version: old!.version }, data: { ...data, version: { increment: 1 }, requirementsReviewedAt: null } })
        : await tx.mpgModel.create({ data });
      await audit(tx, actor, "MpgModel", model.id, "MPG_MODEL_SAVED", { old, model }); return model;
    });
  }
  async requirement(id: string, b: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const model = await tx.mpgModel.findUniqueOrThrow({ where: { id } });
      const intervalMonths = b.intervalMonths == null ? null : integer(b.intervalMonths, 1), firstDueAt = optionalDate(b.firstDueAt);
      if (!intervalMonths && !firstDueAt) throw new BadRequestException("Intervall oder konkrete Fälligkeit fehlt.");
      const result = await tx.mpgRequirement.create({ data: { modelId: id, kind: choice(b.kind, ["STK", "MTK", "MAINTENANCE", "OTHER", "GLUCOSE"]),
        title: text(b.title, "Bezeichnung"), source: text(b.source, "Quelle"), mandatory: b.mandatory !== false, intervalMonths, firstDueAt } });
      await tx.mpgModel.update({ where: { id, version: model.version }, data: { requirementsReviewedAt: null, version: { increment: 1 } } });
      await audit(tx, actor, "MpgModel", id, "MPG_REQUIREMENT_CREATED", result); return result;
    });
  }
  async review(id: string, b: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const model = await tx.mpgModel.findUniqueOrThrow({ where: { id } }); revision(model.version, b.version);
      if (!model.instructionsDocumentId) throw new BadRequestException("Gebrauchsanweisung muss hinterlegt sein.");
      const result = await tx.mpgModel.update({ where: { id, version: model.version }, data: { requirementsReviewSource: text(b.source, "Begründung und Quelle"),
        requirementsReviewedAt: new Date(), requirementsReviewedBy: actor, version: { increment: 1 } } });
      await audit(tx, actor, "MpgModel", id, "MPG_REQUIREMENTS_REVIEWED", result); return result;
    });
  }
}
