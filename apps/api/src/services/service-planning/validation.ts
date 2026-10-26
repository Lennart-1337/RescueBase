import { BadRequestException } from "@nestjs/common";
import {
  array,
  bool,
  choice,
  decimal,
  id,
  integer,
  interval,
  nullable,
  object,
  optionalInteger,
  optionalTimestamp,
  string,
  timestamp,
  unique,
  type Input,
} from "./input.js";
import { qualifications, type ServiceWrite } from "./types.js";
import {
  normalizePerson,
  normalizeVehicle,
  normalizeTariff,
  normalizeChecklist,
} from "./catalog-validation.js";
export {
  normalizePerson,
  normalizeVehicle,
  normalizeTariff,
  normalizeChecklist,
};
const optionalFields = [
  "organizer",
  "leadOrganization",
  "contactName",
  "contactEmail",
  "contactPhone",
  "description",
  "requirements",
] as const;
export function normalizeService(body: Input): ServiceWrite {
  body = object(body);
  const textFields = Object.fromEntries(
    optionalFields.map((key) => [
      key,
      string(
        body[key],
        key,
        false,
        ["description", "requirements"].includes(key) ? 20000 : 191,
      ),
    ]),
  ) as Pick<ServiceWrite, (typeof optionalFields)[number]>;
  const result: ServiceWrite = {
    ...textFields,
    title: string(body.title, "Titel", true),
    customer: string(body.customer, "Auftraggeber", true),
    eventType: string(body.eventType, "Veranstaltungsart", true),
    location: string(body.location, "Ort", true),
    startsAt: timestamp(body.startsAt),
    endsAt: timestamp(body.endsAt),
    eventStartsAt: timestamp(body.eventStartsAt),
    eventEndsAt: timestamp(body.eventEndsAt),
    responsibleId: nullable(body.responsibleId),
    supportOnly: bool(body.supportOnly),
    agreedRevenue:
      body.agreedRevenue == null || body.agreedRevenue === ""
        ? null
        : decimal(body.agreedRevenue, 2),
    positions: array(body.positions).map((value) => {
      const p = object(value);
      return {
        id: id(p.id),
        name: string(p.name, "Position", true),
        qualification: choice(p.qualification, qualifications),
        leader: bool(p.leader),
        quantity: integer(p.quantity, 1),
        team: nullable(p.team),
      };
    }),
    assignments: array(body.assignments).map((value) => {
      const p = object(value);
      return {
        id: id(p.id),
        personId: string(p.personId, "Person", true),
        positionId: string(p.positionId, "Position", true),
        qualification: choice(p.qualification, qualifications),
        startsAt: timestamp(p.startsAt),
        endsAt: timestamp(p.endsAt),
        breakMinutes: integer(p.breakMinutes),
        actualStartsAt: optionalTimestamp(p.actualStartsAt),
        actualEndsAt: optionalTimestamp(p.actualEndsAt),
        actualBreakMinutes: integer(p.actualBreakMinutes),
      };
    }),
    reservations: array(body.reservations).map((value) => {
      const r = object(value);
      return {
        id: id(r.id),
        kind: choice(r.kind, ["VEHICLE", "KIT", "DEVICE"] as const),
        resourceId: string(r.resourceId, "Ressource", true),
        startsAt: timestamp(r.startsAt),
        endsAt: timestamp(r.endsAt),
      };
    }),
    tasks: array(body.tasks).map((value) => {
      const t = object(value);
      return {
        id: id(t.id),
        title: string(t.title, "Aufgabe", true),
        responsibleId: nullable(t.responsibleId),
        dueAt: optionalTimestamp(t.dueAt),
        done: bool(t.done),
      };
    }),
    lines: array(body.lines).map((value) => {
      const l = object(value);
      return {
        id: id(l.id),
        label: string(l.label, "Position", true),
        category: choice(l.category, [
          "PERSONNEL",
          "VEHICLE",
          "MATERIAL",
          "OTHER",
        ] as const),
        unit: string(l.unit, "Einheit", true),
        tariffId: nullable(l.tariffId),
        plannedQuantity: decimal(l.plannedQuantity),
        actualQuantity:
          l.actualQuantity == null || l.actualQuantity === ""
            ? null
            : decimal(l.actualQuantity),
        costRate: decimal(l.costRate),
        saleRate: decimal(l.saleRate),
      };
    }),
    outcome: {
      visitors: null,
      treatments: null,
      transports: null,
      emergencyPhysicians: null,
      conditions: "",
      notes: "",
    },
  };
  if (body.outcome != null) {
    const o = object(body.outcome);
    result.outcome = {
      visitors: optionalInteger(o.visitors),
      treatments: optionalInteger(o.treatments),
      transports: optionalInteger(o.transports),
      emergencyPhysicians: optionalInteger(o.emergencyPhysicians),
      conditions: string(o.conditions, "Bedingungen", false, 20000),
      notes: string(o.notes, "Nachbereitung", false, 20000),
    };
  }
  interval(result.startsAt, result.endsAt);
  interval(result.eventStartsAt, result.eventEndsAt);
  validateChildren(result);
  return result;
}
function validateChildren(data: ServiceWrite) {
  for (const key of [
    "positions",
    "assignments",
    "reservations",
    "tasks",
    "lines",
  ] as const)
    unique(
      data[key].map((row) => row.id),
      key,
    );
  unique(
    data.assignments.map((a) => a.personId),
    "Person",
  );
  for (const p of data.positions)
    if (!p.quantity)
      throw new BadRequestException("Positionsbedarf muss positiv sein.");
  for (const a of data.assignments) {
    interval(a.startsAt, a.endsAt, a.breakMinutes);
    if (!data.positions.some((p) => p.id === a.positionId))
      throw new BadRequestException(
        "Zuteilung benötigt eine vorhandene Position.",
      );
    if (
      Date.parse(a.startsAt) < Date.parse(data.startsAt) ||
      Date.parse(a.endsAt) > Date.parse(data.endsAt)
    )
      throw new BadRequestException(
        "Teilnahme liegt außerhalb des Dienstzeitraums.",
      );
    if (Boolean(a.actualStartsAt) !== Boolean(a.actualEndsAt))
      throw new BadRequestException(
        "Tatsächlicher Zeitraum muss vollständig sein.",
      );
    if (a.actualStartsAt && a.actualEndsAt)
      interval(a.actualStartsAt, a.actualEndsAt, a.actualBreakMinutes);
    else if (a.actualBreakMinutes)
      throw new BadRequestException("Ist-Pause benötigt einen Ist-Zeitraum.");
  }
  for (const r of data.reservations) interval(r.startsAt, r.endsAt);
}
