import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../persistence/prisma.service.js";
import { audit, date, integer, optional, optionalDate, revision, text, type Input } from "./mpg-validation.js";
import { deviceInclude, deviceState } from "./mpg-device-state.js";

@Injectable()
export class MpgDevicesService {
  constructor(private readonly db: PrismaService) {}
  async list() {
    const rows = await this.db.mpgDevice.findMany({ include: deviceInclude, orderBy: { name: "asc" } });
    return rows.map((row) => deviceState(row));
  }
  async get(id: string) {
    const device = await this.db.mpgDevice.findUnique({ where: { id }, include: deviceInclude });
    if (!device) throw new NotFoundException("Gerät nicht gefunden.");
    const [documents, trainings, history] = await Promise.all([
      this.db.mpgDocument.findMany({ where: { OR: [{ deviceId: id }, ...(device.mpgModelId ? [{ modelId: device.mpgModelId }] : [])] } }),
      this.db.mpgTraining.findMany({ where: { modelId: device.mpgModelId ?? "" }, include: { confirmations: true } }),
      this.db.auditEvent.findMany({ where: { entityType: "MpgDevice", entityId: id }, orderBy: { createdAt: "desc" } }),
    ]);
    return { ...deviceState(device), documents: documents.map(({ storageKey: _, ...row }) => row), trainings,
      history: history.map(({ actorLabel, ...event }) => ({ ...event, actorId: actorLabel })) };
  }
  async save(id: string | null, body: Input, actor: string) {
    return this.db.$transaction(async (tx) => {
      const old = id ? await tx.mpgDevice.findUniqueOrThrow({ where: { id } }) : null;
      if (old) { revision(old.version, body.version); if (old.retiredAt) throw new BadRequestException("Gerät ist außer Betrieb."); }
      if ("articleId" in body || "responsiblePersonId" in body) throw new BadRequestException("MPG-Geräte haben keinen Artikelbezug und keine verantwortliche Person.");
      const kitId = optional(body.kitId);
      const kit = kitId ? await tx.kit.findFirst({ where: { id: kitId, deletedAt: null } }) : null;
      if (kitId && !kit) throw new BadRequestException("Rucksack fehlt.");
      const locationId = kit?.locationId ?? text(body.locationId, "Standort");
      if (!await tx.location.findFirst({ where: { id: locationId, deletedAt: null } })) throw new BadRequestException("Standort fehlt.");
      const mpgModelId = optional(body.mpgModelId);
      if (mpgModelId) await tx.mpgModel.findUniqueOrThrow({ where: { id: mpgModelId } });
      const data = { name: text(body.name, "Name"), locationId, kitId, mpgModelId,
        inventoryNumber: optional(body.inventoryNumber), serialNumber: optional(body.serialNumber), lotCode: optional(body.lotCode), notes: optional(body.notes),
        acquisitionYear: body.acquisitionYear == null ? null : integer(body.acquisitionYear, 1900), commissionedAt: optionalDate(body.commissionedAt) };
      const device = old ? await tx.mpgDevice.update({ where: { id: id!, version: old.version }, data: { ...data, version: { increment: 1 }, ...(old.mpgModelId !== mpgModelId ? { releasedAt: null, releasedBy: null } : {}) } as Prisma.MpgDeviceUncheckedUpdateInput }) : await tx.mpgDevice.create({ data: data as Prisma.MpgDeviceUncheckedCreateInput });
      if (!old || old.locationId !== locationId || old.kitId !== kitId) {
        await tx.mpgDeviceAssignment.updateMany({ where: { deviceId: device.id, endedAt: null }, data: { endedAt: new Date() } });
        await tx.mpgDeviceAssignment.create({ data: { deviceId: device.id, locationId, kitId, actorId: actor } as Prisma.MpgDeviceAssignmentUncheckedCreateInput });
      }
      await audit(tx, actor, "MpgDevice", device.id, old ? "MPG_DEVICE_UPDATED" : "MPG_DEVICE_CREATED", { old, device });
      return device;
    });
  }
  async action(id: string, body: Input, actor: string, retire: boolean) {
    return this.db.$transaction(async (tx) => {
      const device = await tx.mpgDevice.findUniqueOrThrow({ where: { id }, include: deviceInclude });
      revision(device.version, body.version);
      if (device.retiredAt) throw new BadRequestException("Gerät bereits außer Betrieb.");
      if (!retire) {
        if (!device.mpgModelId || !device.inventoryNumber || !(device.serialNumber || device.lotCode) || !device.acquisitionYear || !device.commissionedAt)
          throw new BadRequestException("Modell, Inventarnummer, Seriennummer oder Loscode, Anschaffungsjahr und Inbetriebnahme fehlen.");
        const state = deviceState({ ...device, releasedAt: new Date() });
        if (state.status !== "RELEASED") throw new BadRequestException(state.reasons.join(" "));
      }
      const data = retire ? { retiredAt: date(new Date().toISOString()), retirementReason: text(body.reason, "Grund") } : { releasedAt: new Date(), releasedBy: actor };
      const result = await tx.mpgDevice.update({ where: { id, version: device.version }, data: { ...data, version: { increment: 1 } } });
      await audit(tx, actor, "MpgDevice", id, retire ? "MPG_RETIRED" : "MPG_RELEASED", data);
      return result;
    });
  }
  async requirement(id: string, body: Input, actor: string) {
    return this.db.$transaction(async (tx) => {
      const device = await tx.mpgDevice.findUniqueOrThrow({ where: { id }, include: { mpgModel: { include: { requirements: { where: { active: true } } } } } });
      if (device.retiredAt) throw new BadRequestException("Gerät ist außer Betrieb.");
      const kind = text(body.kind, "Prüfart");
      const intervalMonths = body.intervalMonths == null ? null : integer(body.intervalMonths, 1);
      const firstDueAt = optionalDate(body.firstDueAt);
      if (!intervalMonths && !firstDueAt) throw new BadRequestException("Intervall oder konkrete Fälligkeit fehlt.");
      const modelIntervals = (device.mpgModel?.requirements ?? []).filter((row) => row.kind === kind && row.intervalMonths).map((row) => row.intervalMonths!);
      if (intervalMonths && modelIntervals.length && intervalMonths > Math.min(...modelIntervals)) throw new BadRequestException("Eine Modellpflicht darf am Einzelgerät nicht verlängert werden.");
      const result = await tx.mpgRequirement.create({ data: { deviceId: id, kind, title: text(body.title, "Bezeichnung"),
        justification: text(body.justification, "Begründung"), source: text(body.source, "Quelle"), mandatory: true, intervalMonths, firstDueAt } });
      await audit(tx, actor, "MpgDevice", id, "MPG_DEVICE_REQUIREMENT_CREATED", result);
      return result;
    });
  }
}
