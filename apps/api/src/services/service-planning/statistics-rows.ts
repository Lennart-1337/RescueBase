import { serviceCosts } from "./costs.js";
import { attendanceMinutes, type ServiceRecord } from "./record.js";
import { serviceCoverage } from "./statistics-coverage.js";
import { emptyOutcome, type ServiceOutcome } from "./types.js";
export function serviceStatisticRows(records: ServiceRecord[]) {
  return records.map((row) => {
    const actual = row.assignments.map((a) => attendanceMinutes(a, true)),
      outcome = {
        ...emptyOutcome,
        ...(row.outcome as Partial<ServiceOutcome>),
      };
    const costs = serviceCosts(row),
      requiredPersonnel = row.positions.reduce((sum, p) => sum + p.quantity, 0);
    return {
      ...serviceCoverage(row),
      id: row.id,
      title: row.title,
      status: row.status,
      startsAt: row.startsAt,
      eventType: row.eventType,
      customer: row.customer,
      supportOnly: row.supportOnly,
      requiredPersonnel,
      assignedPersonnel: row.assignments.length,
      plannedMinutes: row.assignments.reduce(
        (sum, a) => sum + (attendanceMinutes(a) ?? 0),
        0,
      ),
      actualMinutes: actual.some((value) => value === null)
        ? null
        : actual.reduce<number>((sum, value) => sum + (value ?? 0), 0),
      actualTimeMissing: actual.filter((value) => value === null).length,
      costs,
      outcome,
      forecastComparable: !row.supportOnly && outcome.visitors !== null,
      forecasts: row.supportOnly
        ? []
        : row.calculations
            .filter(
              (c) =>
                (c.result as Record<string, unknown>).status === "COMPLETE",
            )
            .map((c) => ({
              method: c.method,
              createdAt: c.createdAt,
              metrics: (c.result as Record<string, unknown>).metrics ?? {},
            })),
    };
  });
}
