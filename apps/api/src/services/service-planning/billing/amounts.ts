import { BadRequestException } from "@nestjs/common";
import {
  calculateAttendanceAmount,
  calculateServiceCosts,
} from "@rescuebase/domain";
import type { ServiceRecord } from "../record.js";
import { normalizeAdditionalCharges } from "../additional-charges.js";
import type { BillingPdfModel } from "./pdf.js";
type Line = BillingPdfModel["lines"][number];
export const cents = (value: string) => BigInt(value.replace(".", ""));
export function amount(value: bigint) {
  const sign = value < 0n ? "-" : "",
    absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}
const date = (value: Date) =>
  new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
export function billingLines(row: ServiceRecord, actual: boolean): Line[] {
  if (row.pricingModel === "LEGACY") return legacyLines(row, actual);
  const lines = row.assignments.map((assignment): Line => {
    if (
      actual &&
      Boolean(assignment.actualStartsAt) !== Boolean(assignment.actualEndsAt)
    )
      throw new BadRequestException(
        "Angefangene Ist-Zeiten müssen vollständig erfasst oder entfernt werden.",
      );
    const useActual =
      actual && Boolean(assignment.actualStartsAt && assignment.actualEndsAt);
    const start = useActual ? assignment.actualStartsAt! : assignment.startsAt;
    const end = useActual ? assignment.actualEndsAt! : assignment.endsAt;
    const rate = String(assignment.hourlyRate);
    const position = row.positions.find((p) => p.id === assignment.positionId);
    return {
      description: `${position?.name || "Einsatzkraft"}\n${date(start)} – ${date(end)}${actual && !useActual ? " (Plan-Zeiten)" : ""}`,
      timeBasis: useActual ? "ACTUAL" : "PLANNED",
      quantity: `${Math.ceil((end.getTime() - start.getTime()) / 3600000)} h`,
      unitPrice: rate,
      amount: calculateAttendanceAmount(
        start.toISOString(),
        end.toISOString(),
        rate,
      ),
    };
  });
  const material = Number(row.materialRate ?? "35").toFixed(2);
  lines.push({
    description: "Materialpauschale",
    quantity: "1",
    unitPrice: material,
    amount: material,
  });
  if (row.materialDiscounted)
    lines.push({
      description: "Rabatt (Materialpauschale)",
      quantity: "1",
      unitPrice: `-${material}`,
      amount: `-${material}`,
    });
  for (const charge of normalizeAdditionalCharges(row.additionalCharges)) {
    const value = Number(charge.amount).toFixed(2);
    lines.push({
      description: charge.label,
      quantity: "1",
      unitPrice: value,
      amount: value,
    });
  }
  return lines;
}
function legacyLines(row: ServiceRecord, actual: boolean): Line[] {
  const lines = row.lines.map((line): Line => {
    const useActual = actual && line.actualQuantity !== null;
    const quantity = useActual ? line.actualQuantity! : line.plannedQuantity;
    const input = {
      plannedQuantity: String(quantity),
      actualQuantity: null,
      saleRate: String(line.saleRate),
      costRate: "0",
    };
    return {
      description: `${line.label}${actual && !useActual ? " (Plan-Menge)" : ""}`,
      timeBasis: useActual ? "ACTUAL" : "PLANNED",
      quantity: `${quantity} ${line.unit}`,
      unitPrice: String(line.saleRate),
      amount: calculateServiceCosts([input], null).planned.revenue,
    };
  });
  if (row.agreedRevenue !== null) {
    const fixed = Number(row.agreedRevenue).toFixed(2);
    const difference = amount(
      cents(fixed) - lines.reduce((sum, line) => sum + cents(line.amount), 0n),
    );
    if (difference !== "0.00")
      lines.push({
        description: "Anpassung an vereinbarten Pauschalpreis",
        quantity: "1",
        unitPrice: difference,
        amount: difference,
      });
  }
  return lines;
}
