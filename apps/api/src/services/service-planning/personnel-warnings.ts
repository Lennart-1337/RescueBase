import type { ServiceRecord } from "./record.js";
import type { ServiceWarning } from "./types.js";
import type { WarningContext } from "./warning-context.js";
import { binding, overlaps } from "./warning-utils.js";
import { attendanceOverlaps } from "./attendance-overlap.js";
import { qualificationWarning } from "./qualification.js";
export function personnelWarnings(service: ServiceRecord, context: WarningContext): ServiceWarning[] {
  const warnings: ServiceWarning[] = [];
  const add = (code: string, message: string, entityId: string | null = null) => warnings.push({ code, message, entityId });
  for (const a of service.assignments) {
    const person = context.people.find((p) => p.id === a.personId),
      position = service.positions.find((p) => p.id === a.positionId);
    if (!person?.active)
      add("PERSON_INACTIVE", "Eine eingeplante Person ist nicht aktiv.", a.id);
    const qualification = qualificationWarning(person?.qualifications ?? [], position?.qualification, a.endsAt);
    if (qualification) add("QUALIFICATION", qualification, a.id);
    if (position?.leader && !person?.leader)
      add("LEADERSHIP", "Die Führungsfunktion ist nicht nachgewiesen.", a.id);
    if (service.assignments.some((other) =>
      other.id !== a.id && other.personId === a.personId && attendanceOverlaps(a, other)))
      add("PERSON_CONFLICT", "Die Person ist in diesem Dienst zeitgleich mehrfach eingeteilt.", a.id);
    if (
      binding(service.status) &&
      context.peers.some(
        (peer) =>
          binding(peer.status) &&
          peer.assignments.some(
            (other) => other.personId === a.personId && overlaps(a, other),
          ),
      )
    )
      add(
        "PERSON_CONFLICT",
        "Die Person ist zeitgleich in einem anderen Dienst eingeplant.",
        a.id,
      );
  }
  for (const p of service.positions) {
    const assigned = service.assignments.filter((a) => a.positionId === p.id);
    const points = [
      service.startsAt,
      ...assigned.flatMap((a) => [a.startsAt, a.endsAt]),
    ].filter((t) => t >= service.startsAt && t < service.endsAt);
    if (
      points.some(
        (t) =>
          new Set(assigned.filter((a) => a.startsAt <= t && a.endsAt > t)
            .map((a) => a.personId)).size < p.quantity,
      )
    )
      add(
        "UNDERSTAFFED",
        `Position „${p.name}“ ist nicht durchgehend ausreichend besetzt.`,
        p.id,
      );
  }
  if (
    service.status === "REVIEW" &&
    ["visitors", "treatments", "transports", "emergencyPhysicians"].some(
      (key) =>
        (service.outcome as Record<string, unknown> | undefined)?.[key] == null,
    )
  )
    add(
      "OUTCOME_INCOMPLETE",
      "Medizinische Abschlusszahlen sind noch nicht vollständig erfasst.",
    );
  if (!service.positions.length)
    add("NO_POSITIONS", "Der eigene Kräfteansatz ist noch nicht erfasst.");
  return warnings;
}
