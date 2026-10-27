import type { ServiceRecord } from "./record.js";
export function serviceCoverage(row: ServiceRecord) {
  const start = row.startsAt.getTime(),
    end = row.endsAt.getTime();
  const durationMinutes = Math.max(0, (end - start) / 60000);
  const requiredPersonnelMinutes = row.positions.reduce(
    (sum, position) => sum + position.quantity * durationMinutes,
    0,
  );
  let coveredPersonnelMinutes = 0;
  for (const position of row.positions) {
    const assigned = row.assignments.filter(
      (a) => a.positionId === position.id,
    );
    const boundaries = [
      ...new Set([
        start,
        end,
        ...assigned.flatMap((a) => [
          Math.max(start, Math.min(end, a.startsAt.getTime())),
          Math.max(start, Math.min(end, a.endsAt.getTime())),
        ]),
      ]),
    ].sort((a, b) => a - b);
    for (let index = 0; index < boundaries.length - 1; index++) {
      const current = boundaries[index]!,
        next = boundaries[index + 1]!;
      const people = new Set(
        assigned
          .filter(
            (a) =>
              a.startsAt.getTime() <= current && a.endsAt.getTime() > current,
          )
          .map((a) => a.personId),
      );
      coveredPersonnelMinutes +=
        (Math.min(position.quantity, people.size) * (next - current)) / 60000;
    }
  }
  return {
    requiredPersonnelMinutes,
    coveredPersonnelMinutes,
    coverageBasis: "NOMINAL_ASSIGNMENTS" as const,
    occupancyRate: requiredPersonnelMinutes
      ? coveredPersonnelMinutes / requiredPersonnelMinutes
      : null,
  };
}
