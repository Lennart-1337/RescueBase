import type { ServiceRecord } from "./record.js";
/** Statistics may infer completed attendance without writing inferred times to the record. */
export function withCompletedAttendance(record: ServiceRecord): ServiceRecord {
  if (record.status !== "COMPLETED") return record;
  return {
    ...record,
    assignments: record.assignments.map((assignment) =>
      assignment.actualStartsAt === null && assignment.actualEndsAt === null
        ? { ...assignment, actualStartsAt: assignment.startsAt, actualEndsAt: assignment.endsAt }
        : assignment,
    ),
  };
}
