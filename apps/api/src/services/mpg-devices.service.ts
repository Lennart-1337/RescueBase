import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../persistence/prisma.service.js";
import { audit, date, integer, optional, optionalDate, revision, text, type Input } from "./mpg-validation.js";
import { deviceInclude, deviceState } from "./mpg-device-state.js";
@Injectable()
export class MpgDevicesService {
  constructor(private readonly db: PrismaService) {}
  async list() { return (await this.db.medicalDevice.findMany({ include: deviceInclude, orderBy: { name: "asc" } })).map(d => deviceState(d)); }
  async get(id: string) {
    const d = await this.db.medicalDevice.findUnique({ where: { id }, include: deviceInclude });
    if (!d) throw new NotFoundException("Gerät nicht gefunden.");
    const [documents, trainings, history] = await Promise.all([
      this.db.mpgDocument.findMany({ where: { OR: [{ deviceId: id }, ...(d.mpgModelId ? [{ modelId: d.mpgModelId }] : [])] } }),
      this.db.mpgTraining.findMany({ where: { OR: [{ deviceId: id }, ...(d.mpgModelId ? [{ modelId: d.mpgModelId }] : [])] }, include: { confirmations: true } }),
      this.db.auditEvent.findMany({ where: { entityId: id }, orderBy: { createdAt: "desc" } })]);
    return { ...deviceState(d), documents: documents.map(({ storageKey: _key, ...document }) => document), trainings, history };
  }
  async save(id: string | null, b: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const previous = id ? await tx.medicalDevice.findUniqueOrThrow({ where: { id } }) : null;
      if (previous) { revision(previous.version, b.version); if (previous.retiredAt) throw new BadRequestException("Gerät ist außer Betrieb."); }
      const kitId = optional(b.kitId); const kit = kitId ? await tx.kit.findFirst({ where: { id: kitId, deletedAt: null } }) : null;
      if (kitId && !kit) throw new BadRequestException("Rucksack fehlt.");
      const locationId = kit?.locationId ?? text(b.locationId, "Standort");
      if (!await tx.location.findFirst({ where: { id: locationId, deletedAt: null } })) throw new BadRequestException("Standort fehlt.");
      const articleId = text(b.articleId, "Artikel");
      if (!await tx.article.findFirst({ where: { id: articleId, deletedAt: null } })) throw new BadRequestException("Artikel fehlt.");
      const mpgModelId = optional(b.mpgModelId);
      if (mpgModelId) await tx.mpgModel.findUniqueOrThrow({ where: { id: mpgModelId } });
      const responsiblePersonId = optional(b.responsiblePersonId);
      if (responsiblePersonId) await tx.mpgPerson.findFirstOrThrow({ where: { id: responsiblePersonId, active: true } });
      const data = { name: text(b.name, "Name"), articleId, locationId, kitId, mpgModelId, responsiblePersonId,
        inventoryNumber: text(b.inventoryNumber, "Inventarnummer"), serialNumber: optional(b.serialNumber), notes: optional(b.notes),
        acquisitionYear: b.acquisitionYear == null ? null : integer(b.acquisitionYear, 1900), commissionedAt: optionalDate(b.commissionedAt) };
      const device = id ? await tx.medicalDevice.update({ where: { id, version: previous!.version }, data: { ...data, version: { increment: 1 },
        ...(previous?.mpgModelId !== mpgModelId ? { releasedAt: null, releasedBy: null } : {}) } }) : await tx.medicalDevice.create({ data });
      if (!previous || previous.locationId !== locationId || previous.kitId !== kitId || previous.responsiblePersonId !== responsiblePersonId) {
        await tx.mpgDeviceAssignment.updateMany({ where: { deviceId: device.id, endedAt: null }, data: { endedAt: new Date() } });
        await tx.mpgDeviceAssignment.create({ data: { deviceId: device.id, locationId, kitId, responsiblePersonId, actorId: actor } });
      }
      await audit(tx, actor, "MedicalDevice", device.id, id ? "MPG_DEVICE_UPDATED" : "MPG_DEVICE_CREATED", { previous, device });
      return device;
    });
  }
  async action(id: string, b: Input, actor: string, retire: boolean) {
    return this.db.$transaction(async tx => {
      const d = await tx.medicalDevice.findUniqueOrThrow({ where: { id }, include: deviceInclude }); revision(d.version, b.version);
      if (d.retiredAt) throw new BadRequestException("Gerät bereits außer Betrieb.");
      if (!retire) {
        if (!d.inventoryNumber || !d.serialNumber || !d.acquisitionYear || !d.commissionedAt || !d.responsiblePersonId)
          throw new BadRequestException("Inventarnummer, Serien-/Losnummer, Anschaffungsjahr, Inbetriebnahme und Zuständigkeit fehlen.");
        const state = deviceState({ ...d, releasedAt: new Date() });
        if (state.status !== "RELEASED") throw new BadRequestException(state.reasons.join(" "));
      }
      const data = retire ? { retiredAt: date(new Date().toISOString()), retirementReason: text(b.reason, "Grund"), active: false }
        : { releasedAt: new Date(), releasedBy: actor };
      const result = await tx.medicalDevice.update({ where: { id, version: d.version }, data: { ...data, version: { increment: 1 } } });
      await audit(tx, actor, "MedicalDevice", id, retire ? "MPG_RETIRED" : "MPG_RELEASED", data); return result;
    });
  }
}
