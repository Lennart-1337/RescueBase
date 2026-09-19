import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../persistence/prisma.service.js";
import { audit, choice, date, finiteNumber, revision, text, type Input } from "./mpg-validation.js";

@Injectable()
export class MpgCylindersService {
  constructor(private readonly db: PrismaService) {}
  list() { return this.db.mpgCylinder.findMany({ include: { location: true }, orderBy: { cylinderNumber: "asc" } }); }
  async save(id: string | null, body: Input, actor: string) {
    return this.db.$transaction(async (tx) => {
      const old = id ? await tx.mpgCylinder.findUniqueOrThrow({ where: { id } }) : null;
      if (old) revision(old.version, body.version);
      if (old?.status === "RETURNED") throw new BadRequestException("Zurückgegebene Flaschen bleiben unverändert erhalten.");
      if ("supplier" in body || "deviceId" in body) throw new BadRequestException("Lieferant und Druckminderer-Zuordnung werden nicht geführt.");
      const locationId = text(body.locationId, "Standort");
      await tx.location.findFirstOrThrow({ where: { id: locationId, deletedAt: null } });
      const inspectedAt = date(body.inspectedAt), inspectionDueAt = date(body.inspectionDueAt), expiresAt = date(body.expiresAt);
      if (inspectionDueAt <= inspectedAt) throw new BadRequestException("Prüffälligkeit muss nach der Prüfung liegen.");
      const cylinderNumber = text(body.cylinderNumber, "Flaschennummer");
      if (old && cylinderNumber !== old.cylinderNumber) throw new BadRequestException("Die Flaschennummer kann nicht überschrieben werden.");
      const data = { cylinderNumber, sizeLiters: finiteNumber(body.sizeLiters, 0.01),
        locationId, status: choice(body.status, ["FULL", "IN_USE", "EMPTY", "RETURNED"]), inspectedAt, inspectionDueAt, expiresAt };
      const row = old ? await tx.mpgCylinder.update({ where: { id: id!, version: old.version }, data: { ...data, version: { increment: 1 } } }) : await tx.mpgCylinder.create({ data });
      await audit(tx, actor, "MpgCylinder", row.id, "MPG_CYLINDER_SAVED", { old, row });
      return row;
    });
  }
  async return(id: string, body: Input, actor: string) {
    return this.db.$transaction(async (tx) => {
      const cylinder = await tx.mpgCylinder.findUniqueOrThrow({ where: { id } });
      revision(cylinder.version, body.version);
      const row = await tx.mpgCylinder.update({ where: { id, version: cylinder.version }, data: { status: "RETURNED", version: { increment: 1 } } });
      await audit(tx, actor, "MpgCylinder", id, "MPG_CYLINDER_RETURNED", row);
      return row;
    });
  }
}
