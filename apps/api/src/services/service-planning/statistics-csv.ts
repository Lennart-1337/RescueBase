import type { serviceStatistics } from "./statistics.js";
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
