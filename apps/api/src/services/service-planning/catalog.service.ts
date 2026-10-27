import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../persistence/prisma.service.js";
import { audit, revision } from "../mpg-validation.js";
import { deviceInclude, deviceState } from "../mpg-device-state.js";
import {
  normalizePerson,
  normalizeVehicle,
  normalizeTariff,
  normalizeChecklist,
} from "./catalog-validation.js";
import { type Input } from "./input.js";
export const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export const wire = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
@Injectable()
export class ServiceCatalogService {
  constructor(private readonly db: PrismaService) {}
  async catalog() {
    const [people, vehicles, tariffs, checklists, kits, devices, users] =
      await Promise.all([
        this.db.person.findMany({
          include: { qualifications: true },
          orderBy: { name: "asc" },
        }),
        this.db.serviceVehicle.findMany({ orderBy: { name: "asc" } }),
        this.db.serviceTariff.findMany({ orderBy: { name: "asc" } }),
        this.db.serviceChecklist.findMany({ orderBy: { name: "asc" } }),
        this.db.kit.findMany({
          where: { deletedAt: null },
          select: { id: true, name: true, status: true },
        }),
        this.db.mpgDevice.findMany({ include: deviceInclude }),
        this.db.user.findMany({
          where: { active: true, deletedAt: null, banned: false },
          select: { id: true, displayName: true },
        }),
      ]);
    return {
      people: people.map((person) => ({
        ...person,
        qualifications: person.qualifications.map((q) => ({
          ...q,
          validUntil: q.validUntil?.toISOString().slice(0, 10) ?? null,
        })),
      })),
      vehicles,
      tariffs,
      checklists,
      kits,
      devices: devices.map((device) => {
        const state = deviceState(device);
        return {
          id: device.id,
          name: device.name,
          kitId: device.kitId,
          status: state.status,
        };
      }),
      users,
    };
  }
  savePerson(id: string | null, body: Input, actor: string) {
    const { qualifications, ...data } = normalizePerson(body);
    return this.db.$transaction(async (tx) => {
      const old = id ? await tx.person.findUnique({ where: { id } }) : null;
      if (id && !old) throw new NotFoundException("Person nicht gefunden.");
      if (old) revision(old.version, body.version);
      if (data.userId)
        await tx.user.findFirstOrThrow({
          where: { id: data.userId, deletedAt: null, active: true },
        });
      const person = old
        ? await tx.person.update({
            where: { id: old.id, version: old.version },
            data: { ...data, version: { increment: 1 } },
          })
        : await tx.person.create({ data });
      await tx.personQualification.deleteMany({
        where: { personId: person.id },
      });
      await tx.personQualification.createMany({
        data: qualifications.map((q) => ({
          personId: person.id,
          qualification: q.qualification,
          validUntil: q.validUntil ? new Date(q.validUntil) : null,
          recognizedQualifications: json(q.recognizedQualifications),
        })),
      });
      await tx.mpgPerson.updateMany({
        where: { personId: person.id },
        data: {
          name: data.name,
          active: data.active,
          userId: data.userId,
          version: { increment: 1 },
        },
      });
      await audit(tx, actor, "Person", person.id, "SERVICE_PERSON_SAVED", {
        old,
        data,
        qualifications,
      });
      return { ...person, qualifications };
    });
  }
  saveVehicle(id: string | null, body: Input, actor: string) {
    const data = normalizeVehicle(body);
    return this.db.$transaction(async (tx) => {
      const old = id
        ? await tx.serviceVehicle.findUnique({ where: { id } })
        : null;
      if (id && !old) throw new NotFoundException("Datensatz nicht gefunden.");
      if (old) revision(old.version, body.version);
      const result = old
        ? await tx.serviceVehicle.update({
            where: { id: old.id, version: old.version },
            data: { ...data, version: { increment: 1 } },
          })
        : await tx.serviceVehicle.create({ data });
      await audit(
        tx,
        actor,
        "ServiceVehicle",
        result.id,
        "SERVICE_VEHICLE_SAVED",
        { old, result },
      );
      return result;
    });
  }
  saveTariff(id: string | null, body: Input, actor: string) {
    const data = normalizeTariff(body);
    return this.db.$transaction(async (tx) => {
      const old = id
        ? await tx.serviceTariff.findUnique({ where: { id } })
        : null;
      if (id && !old) throw new NotFoundException("Datensatz nicht gefunden.");
      if (old) revision(old.version, body.version);
      const result = old
        ? await tx.serviceTariff.update({
            where: { id: old.id, version: old.version },
            data: { ...data, version: { increment: 1 } },
          })
        : await tx.serviceTariff.create({ data });
      await audit(
        tx,
        actor,
        "ServiceTariff",
        result.id,
        "SERVICE_TARIFF_SAVED",
        { old, result },
      );
      return result;
    });
  }
  saveChecklist(id: string | null, body: Input, actor: string) {
    const data = normalizeChecklist(body);
    return this.db.$transaction(async (tx) => {
      const old = id
        ? await tx.serviceChecklist.findUnique({ where: { id } })
        : null;
      if (id && !old) throw new NotFoundException("Datensatz nicht gefunden.");
      if (old) revision(old.version, body.version);
      const result = old
        ? await tx.serviceChecklist.update({
            where: { id: old.id, version: old.version },
            data: { ...data, version: { increment: 1 } },
          })
        : await tx.serviceChecklist.create({ data });
      await audit(
        tx,
        actor,
        "ServiceChecklist",
        result.id,
        "SERVICE_CHECKLIST_SAVED",
        { old, result },
      );
      return result;
    });
  }
}
