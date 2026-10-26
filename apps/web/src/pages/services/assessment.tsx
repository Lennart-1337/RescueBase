import { displayTime } from "./time";
import type { Calculation } from "./types";
import { calculationLabels } from "./calculation-fields";
import { AssessmentMetrics } from "./assessment-metrics";
import { AssessmentReview } from "./assessment-review";
import "./service-tools.css";
export function AssessmentResult({
  calculation,
}: {
  calculation: Calculation;
}) {
  const result = calculation.result;
  return (
    <article className="service-assessment service-assessment-result">
      <header className="service-assessment-header">
        <h3>
          {calculation.method === "MAURER" ? "Maurer" : "Kölner Algorithmus"}
          {result.status === "INCOMPLETE" ? " · Entwurf" : ""}
        </h3>
        <span className="service-tool-meta">
          {displayTime(calculation.createdAt)}
        </span>
      </header>
      {calculation.reason ? (
        <p className="service-tool-meta">{calculation.reason}</p>
      ) : null}
      {result.missingFields.length ? (
        <p className="service-assessment-missing">
          Fehlt:{" "}
          {result.missingFields
            .map((field) => calculationLabels[field] ?? field)
            .join(", ")}
        </p>
      ) : null}
      <AssessmentMetrics result={result} />
      <span className="service-tool-meta">
        {result.warnings.length}{" "}
        {result.warnings.length === 1 ? "Prüfpunkt" : "Prüfpunkte"}
      </span>
      <details className="service-disclosure">
        <summary>Bewertung und Rechenweg</summary>
        <AssessmentReview calculation={calculation} />
      </details>
    </article>
  );
}
