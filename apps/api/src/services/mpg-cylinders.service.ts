import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../persistence/prisma.service.js";
import { audit, choice, finiteNumber, optionalDate, revision, text, type Input } from "./mpg-validation.js";

@Injectable()
export class MpgCylindersService {
  constructor(private readonly db: PrismaService) {}
  list() { return this.db.mpgCylinder.findMany({ include: { assignments: true }, orderBy: { cylinderNumber: "asc" } }); }
  async save(id: string | null, body: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const old = id ? await tx.mpgCylinder.findUniqueOrThrow({ where: { id } }) : null;
      if (old) revision(old.version, body.version);
      const locationId = text(body.locationId, "Standort");
      await tx.location.findFirstOrThrow({ where: { id: locationId, deletedAt: null } });
      const data = { supplier: text(body.supplier, "Lieferant"), cylinderNumber: text(body.cylinderNumber, "Flaschennummer"),
        sizeLiters: finiteNumber(body.sizeLiters, 0.01), locationId, status: choice(body.status, ["FULL", "IN_USE", "EMPTY", "RETURNED"]),
        inspectedAt: optionalDate(body.inspectedAt) ?? undefined, inspectionDueAt: optionalDate(body.inspectionDueAt) ?? undefined, expiresAt: optionalDate(body.expiresAt) ?? undefined };
      if (data.inspectionDueAt && data.inspectedAt && data.inspectionDueAt <= data.inspectedAt) throw new BadRequestException("Prüffälligkeit muss nach der Prüfung liegen.");
      const row = old ? await tx.mpgCylinder.update({ where: { id: id!, version: old.version }, data: { ...data, version: { increment: 1 } } }) : await tx.mpgCylinder.create({ data });
      await audit(tx, actor, "MpgCylinder", row.id, "MPG_CYLINDER_SAVED", { old, row }); return row;
    });
  }
  async assign(id: string, body: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const cylinder = await tx.mpgCylinder.findUniqueOrThrow({ where: { id }, include: { assignments: { where: { endedAt: null } } } });
      revision(cylinder.version, body.version);
      if (cylinder.status === "RETURNED" || cylinder.status === "EMPTY") throw new BadRequestException("Leere oder zurückgegebene Flaschen können nicht zugeordnet werden.");
      const deviceId = text(body.deviceId, "Druckminderer");
      const device = await tx.medicalDevice.findUniqueOrThrow({ where: { id: deviceId }, include: { mpgModel: true, cylinderAssignments: { where: { endedAt: null } } } });
      if (device.retiredAt || !/druckminderer/i.test(`${device.mpgModel?.productType ?? ""} ${device.mpgModel?.name ?? ""}`)) throw new BadRequestException("Zuordnung ist nur zu einem aktiven Druckminderer möglich.");
      await tx.mpgCylinderAssignment.updateMany({ where: { OR: [{ cylinderId: id }, { deviceId }], endedAt: null }, data: { endedAt: new Date() } });
      const assignment = await tx.mpgCylinderAssignment.create({ data: { cylinderId: id, deviceId, actorId: actor } });
      await tx.mpgCylinder.update({ where: { id, version: cylinder.version }, data: { status: "IN_USE", version: { increment: 1 } } });
      await audit(tx, actor, "MpgCylinder", id, "MPG_CYLINDER_ASSIGNED", assignment); return assignment;
    });
  }
  async return(id: string, body: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const cylinder = await tx.mpgCylinder.findUniqueOrThrow({ where: { id } }); revision(cylinder.version, body.version);
      await tx.mpgCylinderAssignment.updateMany({ where: { cylinderId: id, endedAt: null }, data: { endedAt: new Date() } });
      const row = await tx.mpgCylinder.update({ where: { id, version: cylinder.version }, data: { status: "RETURNED", version: { increment: 1 } } });
      await audit(tx, actor, "MpgCylinder", id, "MPG_CYLINDER_RETURNED", row); return row;
    });
  }
}
