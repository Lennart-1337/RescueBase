import {
  array,
  bool,
  calendarDate,
  choice,
  decimal,
  object,
  nullable,
  string,
  unique,
  type Input,
} from "./input.js";
import { qualifications, type ServicePersonWrite } from "./types.js";
export function normalizePerson(body: Input): ServicePersonWrite {
  body = object(body);
  const rows = array(body.qualifications).map((value) => {
    const q = object(value);
    return {
      qualification: choice(q.qualification, qualifications),
      validUntil: calendarDate(q.validUntil),
      recognizedQualifications: array(q.recognizedQualifications).map((item) =>
        choice(item, qualifications),
      ),
    };
  });
  unique(
    rows.map((row) => row.qualification),
    "Qualifikation",
  );
  return {
    name: string(body.name, "Name", true),
    active: bool(body.active, true),
    leader: bool(body.leader),
    userId: nullable(body.userId),
    qualifications: rows,
  };
}
export function normalizeVehicle(body: Input) {
  body = object(body);
  return {
    name: string(body.name, "Fahrzeug", true),
    registration: string(body.registration, "Kennzeichen", true),
    type: string(body.type, "Fahrzeugtyp", true),
    ready: bool(body.ready, true),
    notes: string(body.notes, "Hinweise", false, 20000),
    active: bool(body.active, true),
  };
}
export function normalizeTariff(body: Input) {
  body = object(body);
  return {
    name: string(body.name, "Tarif", true),
    category: choice(body.category, [
      "PERSONNEL",
      "VEHICLE",
      "MATERIAL",
      "OTHER",
    ] as const),
    unit: string(body.unit, "Einheit", true),
    costRate: decimal(body.costRate),
    saleRate: decimal(body.saleRate),
    active: bool(body.active, true),
  };
}
export function normalizeChecklist(body: Input) {
  body = object(body);
  return {
    name: string(body.name, "Checkliste", true),
    tasks: array(body.tasks).map((item) => string(item, "Aufgabe", true)),
    active: bool(body.active, true),
  };
}
