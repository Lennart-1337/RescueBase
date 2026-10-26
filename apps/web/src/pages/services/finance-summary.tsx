import { money } from "./time";
import type { Costs } from "./types";
export function FinanceSummary({ costs }: { costs: Costs }) {
  return (
    <>
      <dl className="service-facts service-tool-totals">
        <div>
          <dt>Plankosten</dt>
          <dd>{money(costs.planned.cost)}</dd>
        </div>
        <div>
          <dt>Planerlös</dt>
          <dd>{money(costs.agreedRevenue ?? costs.planned.revenue)}</dd>
        </div>
        <div>
          <dt>Planergebnis</dt>
          <dd>{money(costs.planned.result)}</dd>
        </div>
        <div>
          <dt>Ist-Kosten</dt>
          <dd>{money(costs.actual.cost)}</dd>
        </div>
        <div>
          <dt>Ist-Erlös</dt>
          <dd>{money(costs.agreedRevenue ?? costs.actual.revenue)}</dd>
        </div>
        <div>
          <dt>Ist-Ergebnis</dt>
          <dd>{money(costs.actual.result)}</dd>
        </div>
      </dl>
      {!costs.actual.complete ? (
        <p className="service-tool-status">
          Nachkalkulation offen · bisherige Kosten{" "}
          {money(costs.actual.knownCost)} · tariflicher Erlös{" "}
          {money(costs.actual.knownRevenue)}
        </p>
      ) : null}
      {costs.agreedRevenue !== null ? (
        <details className="service-disclosure">
          <summary>Tarifvergleich</summary>
          <dl className="service-facts">
            <div>
              <dt>Vereinbarter Erlös</dt>
              <dd>{money(costs.agreedRevenue)}</dd>
            </div>
            <div>
              <dt>Tariflicher Planerlös</dt>
              <dd>{money(costs.planned.revenue)}</dd>
            </div>
            <div>
              <dt>Tariflicher Ist-Erlös</dt>
              <dd>{money(costs.actual.revenue)}</dd>
            </div>
          </dl>
        </details>
      ) : null}
    </>
  );
}
