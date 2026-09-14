import { BadRequestException, Injectable } from "@nestjs/common";
import { evaluateGlucoseControl } from "@rescuebase/domain";
import { PrismaService } from "../persistence/prisma.service.js";
import { audit, choice, date, isFutureCalendarDate, optional, optionalDate, revision, text, type Input } from "./mpg-validation.js";

@Injectable()
export class MpgOperationsService {
  constructor(private readonly db: PrismaService) {}

  async glucose(deviceId: string, body: Input, actor: string) {
    const performedAt = date(body.performedAt);
    if (isFutureCalendarDate(performedAt)) throw new BadRequestException("Kontrolldatum liegt in der Zukunft.");
    const targetMin = finite(body.targetMin), targetMax = finite(body.targetMax), value = finite(body.value);
    let evaluation;
    try { evaluation = evaluateGlucoseControl({ measuredAt: performedAt.toISOString(), unit: text(body.unit, "Einheit"),
      rangeUnit: text(body.targetUnit, "Sollbereichseinheit"), lower: targetMin, upper: targetMax, value,
      solutionExpiresOn: text(body.solutionExpiresAt, "Verfall der Kontrolllösung") }); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Kontrollmessung ungültig."); }
    return this.db.$transaction(async tx => {
      const device = await tx.medicalDevice.findUniqueOrThrow({ where: { id: deviceId }, include: { mpgModel: true } });
      if (device.retiredAt || !device.mpgModel || !/blutzucker|\bbz\b/i.test(`${device.mpgModel.productType} ${device.mpgModel.name}`)) {
        throw new BadRequestException("BZ-Kontrollen sind nur für aktive Blutzuckermessgeräte zulässig.");
      }
      const personId = text(body.personId, "Ausführende Person");
      await tx.mpgPerson.findFirstOrThrow({ where: { id: personId, active: true } });
      const row = await tx.mpgGlucoseControl.create({ data: { deviceId, performedAt, personId,
        stripLot: text(body.stripLot, "Teststreifencharge"), solutionName: text(body.solutionName, "Kontrolllösung"),
        solutionLot: text(body.solutionLot, "Charge der Kontrolllösung"), solutionExpiresAt: date(body.solutionExpiresAt),
        controlLevel: text(body.controlLevel, "Kontrollniveau"), unit: text(body.unit, "Einheit"),
        targetUnit: text(body.targetUnit, "Sollbereichseinheit"), targetMin, targetMax, value,
        passed: evaluation.passed, clarification: evaluation.reasons.length ? evaluation.reasons.join(" ") : null, finalizedBy: actor } });
      await audit(tx, actor, "MedicalDevice", deviceId, "MPG_GLUCOSE_CONTROL_FINALIZED", row); return row;
    });
  }

  async resolveGlucose(id: string, body: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const row = await tx.mpgGlucoseControl.findUniqueOrThrow({ where: { id } });
      if (row.passed || row.resolvedAt) throw new BadRequestException("Diese Kontrolle benötigt keine Klärung.");
      const retry = await tx.mpgGlucoseControl.findFirst({ where: { deviceId: row.deviceId, passed: true, performedAt: { gt: row.performedAt } } });
      if (!retry) throw new BadRequestException("Vor der Klärung ist eine erfolgreiche Wiederholungsmessung erforderlich.");
      const result = await tx.mpgGlucoseControl.update({ where: { id }, data: { clarification: text(body.clarification, "Ursache und Maßnahmen"), resolvedAt: new Date(), resolvedBy: actor } });
      await audit(tx, actor, "MedicalDevice", row.deviceId, "MPG_GLUCOSE_CONTROL_RESOLVED", result); return result;
    });
  }

  async incident(deviceId: string, body: Input, actor: string) {
    const occurredAt = date(body.occurredAt);
    if (isFutureCalendarDate(occurredAt)) throw new BadRequestException("Datum des Vorkommnisses liegt in der Zukunft.");
    return this.db.$transaction(async tx => {
      const device = await tx.medicalDevice.findUniqueOrThrow({ where: { id: deviceId } });
      if (device.retiredAt) throw new BadRequestException("Gerät ist außer Betrieb.");
      const row = await tx.mpgIncident.create({ data: { deviceId, occurredAt,
        description: text(body.description, "Beschreibung"), measures: text(body.measures, "Maßnahmen"), safetyRelevant: body.safetyRelevant === true } });
      await audit(tx, actor, "MedicalDevice", deviceId, "MPG_INCIDENT_CREATED", row); return row;
    });
  }

  async updateIncident(id: string, body: Input, actor: string) {
    return this.db.$transaction(async tx => {
      const old = await tx.mpgIncident.findUniqueOrThrow({ where: { id } }); revision(old.version, body.version);
      const status = choice(body.status, ["OPEN", "RESOLVED"]);
      const row = await tx.mpgIncident.update({ where: { id, version: old.version }, data: {
        measures: text(body.measures, "Maßnahmen"), status, reportedAt: optionalDate(body.reportedAt),
        reportReference: optional(body.reportReference), resolvedAt: status === "RESOLVED" ? new Date() : null,
        resolvedBy: status === "RESOLVED" ? actor : null, version: { increment: 1 } } });
      await audit(tx, actor, "MedicalDevice", old.deviceId, "MPG_INCIDENT_UPDATED", { old, row }); return row;
    });
  }
}

function finite(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new BadRequestException("Messwerte müssen gültige Zahlen sein.");
  return number;
}
