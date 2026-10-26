import type { Calculation } from "./types";
import { calculationLabels } from "./calculation-fields";
import { assessmentWarnings } from "./assessment-warnings";
const n = (value: number) =>
  value.toLocaleString("de-DE", { maximumFractionDigits: 3 });
export function AssessmentReview({
  calculation,
}: {
  calculation: Calculation;
}) {
  const result = calculation.result,
    station = result.recommendation?.treatmentStation;
  return (
    <div className="service-assessment-review">
      <ul>
        {result.warnings.map((warning, index) => (
          <li key={index}>
            {assessmentWarnings[warning] ??
              "Diese Berechnung benötigt eine fachliche Prüfung."}
          </li>
        ))}
      </ul>
      {result.recommendation?.additionalCrewRequired ? (
        <p>
          Fahrzeugbesatzungen sind zusätzlich einzuplanen und dürfen nicht
          doppelt als Helfer zählen.
        </p>
      ) : null}
      {station ? (
        <section>
          <h4>Besatzung der Behandlungsstelle</h4>
          <p>
            {station.helpers} Helfer · {station.paramedics} Rettungssanitäter ·{" "}
            {station.advancedProviders} weiterführende Fachkräfte ·{" "}
            {station.emergencyDoctors} Ärzte
          </p>
        </section>
      ) : null}
      {result.zones?.length ? (
        <div className="service-scroll">
          <table className="service-simple-table">
            <thead>
              <tr>
                <th>Wachbezirk</th>
                <th>Hilfeleistungen/h</th>
                <th>Zugriffsteams</th>
                <th>Behandlungsstelle</th>
              </tr>
            </thead>
            <tbody>
              {result.zones.map((zone) => (
                <tr key={zone.id}>
                  <td>{zone.id}</td>
                  <td>{n(zone.presentationsPerHour)}</td>
                  <td>{zone.responseTeamCount}</td>
                  <td>
                    {zone.treatmentStation
                      ? {
                          MOBILE_1_1: "Mobile Versorgung 1/1",
                          UHS_1_5: "Unfallhilfsstelle 1/5",
                          UHS_1_1_8: "Unfallhilfsstelle 1/1/8",
                        }[zone.treatmentStation]
                      : "Keine"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <dl className="service-calculation-steps">
        {result.steps.map((step) => (
          <div key={step.key}>
            <dt>{calculationLabels[step.key] ?? step.key}</dt>
            <dd>
              {n(step.value)}
              <small>{step.formula}</small>
            </dd>
          </div>
        ))}
      </dl>
      <div className="service-assessment-sources">
        {result.sourceUrls.map((source, index) => (
          <a key={source} href={source} target="_blank" rel="noreferrer">
            Originalquelle {index + 1}
          </a>
        ))}
      </div>
      <small className="service-tool-meta">
        {result.methodVersion} · Methodischer Vorschlag, fachliche Freigabe
        erforderlich.
      </small>
    </div>
  );
}
