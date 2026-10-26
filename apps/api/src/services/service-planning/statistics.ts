import { Prisma } from "@prisma/client";
import { serviceCosts } from "./costs.js";
import { attendanceMinutes, type ServiceRecord } from "./record.js";
import { emptyOutcome, type ServiceOutcome } from "./types.js";
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
      (a) =>
        a.positionId === position.id &&
        a.qualification === position.qualification,
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
  const breakCoverageUncertain = row.assignments.some(
    (a) => a.breakMinutes > 0,
  );
  return {
    requiredPersonnelMinutes,
    coveredPersonnelMinutes,
    breakCoverageUncertain,
    coverageBasis: "NOMINAL_ASSIGNMENTS" as const,
    occupancyRate:
      requiredPersonnelMinutes && !breakCoverageUncertain
        ? coveredPersonnelMinutes / requiredPersonnelMinutes
        : null,
  };
}
const money = (values: (string | null)[]) =>
  values.some((value) => value === null)
    ? null
    : values
        .reduce<Prisma.Decimal>(
          (sum, value) => sum.add(value ?? 0),
          new Prisma.Decimal(0),
        )
        .toFixed(2);
export function serviceStatistics(records: ServiceRecord[]) {
  const rows = records.map((row) => {
    const actual = row.assignments.map((a) => attendanceMinutes(a, true)),
      outcome = {
        ...emptyOutcome,
        ...(row.outcome as Partial<ServiceOutcome>),
      };
    const costs = serviceCosts(row.lines, row.agreedRevenue),
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
  const qualificationNames = [
    ...new Set(
      records.flatMap((row) => row.assignments.map((a) => a.qualification)),
    ),
  ];
  const qualifications = qualificationNames.map((qualification) => {
    const assigned = records
        .flatMap((row) => row.assignments)
        .filter((a) => a.qualification === qualification),
      actual = assigned.map((a) => attendanceMinutes(a, true));
    return {
      qualification,
      plannedMinutes: assigned.reduce(
        (sum, a) => sum + (attendanceMinutes(a) ?? 0),
        0,
      ),
      actualMinutes: actual.some((n) => n === null)
        ? null
        : actual.reduce<number>((sum, n) => sum + (n ?? 0), 0),
      actualTimeMissing: actual.filter((n) => n === null).length,
    };
  });
  const medicalKeys = [
    "visitors",
    "treatments",
    "transports",
    "emergencyPhysicians",
  ] as const;
  const medical = Object.fromEntries(
    medicalKeys.map((key) => {
      const values = rows.map((row) => row.outcome[key]);
      return [
        key,
        {
          total: values.some((value) => value === null)
            ? null
            : values.reduce<number>((sum, value) => sum + (value ?? 0), 0),
          knownTotal: values.reduce<number>(
            (sum, value) => sum + (value ?? 0),
            0,
          ),
          missing: values.filter((value) => value === null).length,
        },
      ];
    }),
  );
  const requiredPersonnel = rows.reduce(
      (sum, row) => sum + row.requiredPersonnel,
      0,
    ),
    assignedPersonnel = rows.reduce(
      (sum, row) => sum + row.assignedPersonnel,
      0,
    );
  const requiredPersonnelMinutes = rows.reduce(
    (sum, row) => sum + row.requiredPersonnelMinutes,
    0,
  );
  const coveredPersonnelMinutes = rows.reduce(
    (sum, row) => sum + row.coveredPersonnelMinutes,
    0,
  );
  const breakCoverageUncertain = rows.some((row) => row.breakCoverageUncertain);
  const totals = {
    coverageBasis: "NOMINAL_ASSIGNMENTS" as const,
    requiredPersonnelMinutes,
    coveredPersonnelMinutes,
    breakCoverageUncertain,
    services: rows.length,
    requiredPersonnel,
    assignedPersonnel,
    occupancyRate:
      requiredPersonnelMinutes && !breakCoverageUncertain
        ? coveredPersonnelMinutes / requiredPersonnelMinutes
        : null,
    plannedMinutes: rows.reduce((sum, row) => sum + row.plannedMinutes, 0),
    actualMinutes: rows.some((row) => row.actualMinutes === null)
      ? null
      : rows.reduce((sum, row) => sum + (row.actualMinutes ?? 0), 0),
    actualTimeMissing: rows.reduce(
      (sum, row) => sum + row.actualTimeMissing,
      0,
    ),
    plannedCost: money(rows.map((row) => row.costs.planned.cost)),
    plannedRevenue: money(
      rows.map((row) => row.costs.agreedRevenue ?? row.costs.planned.revenue),
    ),
    plannedResult: money(rows.map((row) => row.costs.planned.result)),
    actualCost: money(rows.map((row) => row.costs.actual.cost)),
    actualRevenue: money(
      rows.map((row) => row.costs.agreedRevenue ?? row.costs.actual.revenue),
    ),
    actualResult: money(rows.map((row) => row.costs.actual.result)),
    medical,
  };
  return { totals, qualifications, rows };
}
export function statisticsCsv(
  statistics: ReturnType<typeof serviceStatistics>,
) {
  const cell = (value: unknown) => {
    const text = value == null ? "" : String(value);
    return `"${(/^[=+@-]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
  };
  const header = [
    "Dienst",
    "Status",
    "Beginn",
    "Veranstaltungsart",
    "Auftraggeber",
    "Personalstunden Plan",
    "Personalstunden Ist",
    "Kosten Plan EUR",
    "Erlös Plan EUR",
    "Ergebnis Plan EUR",
    "Kosten Ist EUR",
    "Erlös Ist EUR",
    "Ergebnis Ist EUR",
    "Besucher",
    "Hilfeleistungen",
    "Transporte",
    "Notarztnachforderungen",
  ];
  return (
    "\uFEFF" +
    [
      header,
      ...statistics.rows.map((row) => [
        row.title,
        row.status,
        row.startsAt.toISOString(),
        row.eventType,
        row.customer,
        row.plannedMinutes / 60,
        row.actualMinutes === null ? null : row.actualMinutes / 60,
        row.costs.planned.cost,
        row.costs.agreedRevenue ?? row.costs.planned.revenue,
        row.costs.planned.result,
        row.costs.actual.cost,
        row.costs.agreedRevenue ?? row.costs.actual.revenue,
        row.costs.actual.result,
        row.outcome.visitors,
        row.outcome.treatments,
        row.outcome.transports,
        row.outcome.emergencyPhysicians,
      ]),
    ]
      .map((row) => row.map(cell).join(";"))
      .join("\r\n")
  );
}
