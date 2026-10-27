import { money } from "./time";
import type { Costs } from "./types";
export function FinanceSummary({
  costs,
  legacy = false,
}: {
  costs: Costs | null;
  legacy?: boolean;
}) {
  const planned =
    costs && legacy
      ? (costs.agreedRevenue ?? costs.planned.revenue)
      : costs?.planned.revenue;
  const actual =
    costs && legacy && costs.actual.complete
      ? (costs.agreedRevenue ?? costs.actual.revenue)
      : costs?.actual.revenue;
  return (
    <dl className="service-facts service-tool-totals">
      <div>
        <dt>Gesamt geplant</dt>
        <dd>{costs ? money(planned) : "–"}</dd>
      </div>
      <div>
        <dt>Gesamt tatsächlich</dt>
        <dd>{costs ? money(actual) : "–"}</dd>
      </div>
    </dl>
  );
}
