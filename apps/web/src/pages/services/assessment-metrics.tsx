import type { Assessment } from "./types";
const n = (value: number) =>
  value.toLocaleString("de-DE", { maximumFractionDigits: 3 });
export function AssessmentMetrics({ result }: { result: Assessment }) {
  const recommendation = result.recommendation;
  if (!recommendation) return null;
  const values: [string, string | number][] = [
    ["Helfer", recommendation.helpers],
    ["KTW", recommendation.ktw],
    ["RTW", recommendation.rtw],
    ["Ärzte gesamt", recommendation.emergencyDoctors],
  ];
  if (recommendation.paramedics != null)
    values.push(["Rettungssanitäter", recommendation.paramedics]);
  if (recommendation.advancedProviders != null)
    values.push([
      "Weiterführende Qualifikation",
      recommendation.advancedProviders,
    ]);
  values.push([
    "Führung",
    {
      NONE: "Keine Tabellenempfehlung",
      REDUCED_STAFF: "Reduzierter Führungsstab",
      FULL_STAFF: "Voller Führungsstab",
      UNDETERMINED: "Offen",
    }[recommendation.command],
  ]);
  if (result.metrics.additionalEmergencyDoctorVehicles != null)
    values.push([
      "Zusätzliche Notarztfahrzeuge",
      result.metrics.additionalEmergencyDoctorVehicles,
    ]);
  if (result.metrics.maximumWalkingDistanceMeters != null)
    values.push([
      "Maximaler Weg",
      `${n(result.metrics.maximumWalkingDistanceMeters)} m`,
    ]);
  return (
    <>
      <dl className="service-facts service-tool-totals">
        {values.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {recommendation.treatmentStation ? (
        <p className="service-tool-status">
          Behandlungsstelle · {recommendation.treatmentStation.treatmentPlaces}{" "}
          Behandlungsplätze · {recommendation.treatmentStation.restPlaces}{" "}
          Ruheplätze
        </p>
      ) : null}
    </>
  );
}
