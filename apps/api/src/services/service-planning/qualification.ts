import type { WarningContext } from "./warning-context.js";
import type { ServiceRecord } from "./record.js";
import { storedQualificationDay } from "./qualification-records.js";
const labels: Record<string, string> = {
  SANITARIAN: "Sanitäter", RESCUE_HELPER: "Rettungshelfer", PARAMEDIC: "Rettungssanitäter",
  EMERGENCY_PARAMEDIC: "Notfallsanitäter", PHYSICIAN: "Arzt",
};
export function qualificationWarning(
  qualifications: WarningContext["people"][number]["qualifications"],
  required: string | undefined,
  endsAt: Date,
): string | null {
  if (!required) return "Die Qualifikationsanforderung der Position ist nicht verfügbar.";
  const matching = qualifications.filter((q) => q.qualification === required ||
    (Array.isArray(q.recognizedQualifications) && q.recognizedQualifications.includes(required)));
  const name = labels[required] ?? required;
  if (!matching.length)
    return `Die Qualifikation „${name}“ ist für diese Position nicht nachgewiesen oder ausdrücklich anerkannt.`;
  const lastDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(endsAt.getTime() - 1));
  const days = matching.map((q) => q.validUntil === null ? null : storedQualificationDay(q.validUntil));
  if (matching.some((q, index) => q.validUntil === null || (days[index] !== null && days[index]! >= lastDay))) return null;
  if (days.some((day) => day === null))
    return `Das Gültigkeitsdatum für „${name}“ ist ungültig und muss korrigiert werden.`;
  return `Der Nachweis für „${name}“ ist nicht bis zum Ende der Teilnahme gültig.`;
}

/** The position defines the planned role; old copied assignment values remain stored for audit. */
export function withPositionQualifications(row: ServiceRecord): ServiceRecord {
  const positions = new Map(row.positions.map((position) => [position.id, position.qualification]));
  return { ...row, assignments: row.assignments.map((assignment) => ({
    ...assignment, qualification: positions.get(assignment.positionId) ?? assignment.qualification,
  })) };
}
