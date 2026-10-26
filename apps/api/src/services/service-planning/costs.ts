import { calculateServiceCosts } from "@rescuebase/domain";
import type { Prisma } from "@prisma/client";
type Amount = string | Prisma.Decimal;
type CostLine = {
  plannedQuantity: Amount;
  actualQuantity: Amount | null;
  costRate: Amount;
  saleRate: Amount;
};
export function serviceCosts(lines: CostLine[], agreed: Amount | null) {
  return calculateServiceCosts(
    lines.map((line) => ({
      plannedQuantity: String(line.plannedQuantity),
      actualQuantity:
        line.actualQuantity === null ? null : String(line.actualQuantity),
      costRate: String(line.costRate),
      saleRate: String(line.saleRate),
    })),
    agreed === null ? null : String(agreed),
  );
}
