import { Prisma } from "@prisma/client";
import { attendanceMinutes, type ServiceRecord } from "./record.js";
import { serviceStatisticRows } from "./statistics-rows.js";
export { serviceCoverage } from "./statistics-coverage.js";
export { statisticsCsv } from "./statistics-csv.js";
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
  const rows = serviceStatisticRows(records);
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
  const totals = {
    coverageBasis: "NOMINAL_ASSIGNMENTS" as const,
    requiredPersonnelMinutes,
    coveredPersonnelMinutes,
    services: rows.length,
    requiredPersonnel,
    assignedPersonnel,
    occupancyRate: requiredPersonnelMinutes
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
