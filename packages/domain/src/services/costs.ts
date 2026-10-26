/** Decimal strings preserve exact amounts across database and JSON boundaries. */
export interface ServiceCostInput {
  plannedQuantity: string;
  actualQuantity: string | null;
  costRate: string;
  saleRate: string;
}
export interface CostSummary {
  currency: "EUR";
  agreedRevenue: string | null;
  planned: { cost: string; revenue: string; result: string };
  actual: {
    complete: boolean;
    cost: string | null;
    revenue: string | null;
    knownCost: string;
    knownRevenue: string;
    result: string | null;
  };
}
function decimal(value: string): bigint {
  if (typeof value !== "string" || !/^\d{1,10}(\.\d{1,4})?$/.test(value)) {
    throw new Error(
      "Amounts require non-negative decimal strings with at most four decimal places.",
    );
  }
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole!) * 10000n + BigInt(fraction.padEnd(4, "0"));
}
function money(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}
const roundCents = (scaled: bigint) => (scaled + 50n) / 100n;
export function calculateServiceCosts(
  lines: ServiceCostInput[],
  agreedRevenue: string | null,
): CostSummary {
  const parsed = lines.map((line) => ({
    planned: decimal(line.plannedQuantity),
    actual: line.actualQuantity === null ? null : decimal(line.actualQuantity),
    cost: decimal(line.costRate),
    sale: decimal(line.saleRate),
  }));
  const sum = (actual: boolean, field: "cost" | "sale") =>
    parsed.reduce((total, line) => {
      const quantity = actual ? (line.actual ?? 0n) : line.planned;
      // Both inputs have scale 10^4, so 10^6 converts product to whole cents.
      return total + (quantity * line[field] + 500000n) / 1000000n;
    }, 0n);
  const plannedCost = sum(false, "cost"),
    plannedSales = sum(false, "sale");
  const actualCost = sum(true, "cost"),
    actualSales = sum(true, "sale");
  const agreed =
    agreedRevenue === null ? null : roundCents(decimal(agreedRevenue));
  const complete =
    parsed.length > 0 && parsed.every((line) => line.actual !== null);
  return {
    currency: "EUR",
    agreedRevenue: agreed === null ? null : money(agreed),
    planned: {
      cost: money(plannedCost),
      revenue: money(plannedSales),
      result: money((agreed ?? plannedSales) - plannedCost),
    },
    actual: {
      complete,
      cost: complete ? money(actualCost) : null,
      revenue: complete ? money(actualSales) : null,
      knownCost: money(actualCost),
      knownRevenue: money(actualSales),
      result: complete ? money((agreed ?? actualSales) - actualCost) : null,
    },
  };
}
