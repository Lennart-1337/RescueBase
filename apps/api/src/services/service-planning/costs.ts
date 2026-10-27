import {
  calculateAttendancePricing,
  calculateServiceCosts,
} from "@rescuebase/domain";
import { normalizeAdditionalCharges } from "./additional-charges.js";
import type { ServiceRecord } from "./record.js";
export function serviceCosts(row: ServiceRecord) {
  if (row.pricingModel === "LEGACY")
    return calculateServiceCosts(
      row.lines.map((line) => ({
        plannedQuantity: String(line.plannedQuantity),
        actualQuantity:
          line.actualQuantity === null ? null : String(line.actualQuantity),
        costRate: String(line.costRate),
        saleRate: String(line.saleRate),
      })),
      row.agreedRevenue === null ? null : String(row.agreedRevenue),
    );
  return calculateAttendancePricing(
    row.assignments.map((assignment) => ({
      startsAt: assignment.startsAt.toISOString(),
      endsAt: assignment.endsAt.toISOString(),
      actualStartsAt: assignment.actualStartsAt?.toISOString() ?? null,
      actualEndsAt: assignment.actualEndsAt?.toISOString() ?? null,
      hourlyRate: String(assignment.hourlyRate),
    })),
    row.materialDiscounted,
    row.materialRate?.toString() ?? "35.00",
    normalizeAdditionalCharges(row.additionalCharges),
  );
}
