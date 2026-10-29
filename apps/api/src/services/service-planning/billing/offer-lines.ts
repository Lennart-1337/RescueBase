import type { BillingPdfModel } from "./pdf.js";
import type { ServiceRecord } from "../record.js";
import { amount, cents } from "./amounts.js";
type Line = BillingPdfModel["lines"][number];
const day = (value: Date) =>
  new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
const time = (value: Date) =>
  new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
export function offerLines(row: ServiceRecord, lines: Line[]) {
  if (row.pricingModel === "LEGACY")
    return lines.map((line) => ({
      ...line,
      date: row.startsAt ? day(row.startsAt) : "",
      count: line.quantity,
    }));
  const groups = new Map<string, Line>();
  row.assignments.forEach((assignment, index) => {
    const original = lines[index]!,
      start = assignment.startsAt,
      end = assignment.endsAt;
    const description =
      row.positions.find((position) => position.id === assignment.positionId)
        ?.name || "Einsatzkraft";
    const key = JSON.stringify([
      description,
      String(assignment.hourlyRate),
      start.toISOString(),
      end.toISOString(),
    ]);
    const previous = groups.get(key);
    if (previous) {
      previous.count = String(Number(previous.count) + 1);
      previous.amount = amount(cents(previous.amount) + cents(original.amount));
    } else {
      const hours = new Intl.NumberFormat("de-DE", {
        maximumFractionDigits: 4,
      }).format((end.getTime() - start.getTime()) / 3600000);
      const endTime =
        day(start) === day(end) ? time(end) : `${day(end)} ${time(end)}`;
      groups.set(key, {
        ...original,
        description,
        date: day(start),
        duration: `${hours} h (${time(start)}–${endTime} Uhr)`,
        count: "1",
      });
    }
  });
  const first = row.startsAt ?? row.assignments[0]?.startsAt;
  return [
    ...groups.values(),
    ...lines
      .slice(row.assignments.length)
      .map((line) => ({ ...line, date: first ? day(first) : "", count: "1" })),
  ];
}
