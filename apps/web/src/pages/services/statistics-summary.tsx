import { formatMinutes, money } from "./time";
import { qualificationLabels, type ServiceStatistics } from "./types";
const medicalLabels: Record<string, string> = {
  visitors: "Besucher",
  treatments: "Hilfeleistungen",
  transports: "Transporte",
  emergencyPhysicians: "Notarztnachforderungen",
};
export function StatisticsSummary({ result }: { result: ServiceStatistics }) {
  const totals = result.totals,
    treatments = totals.medical.treatments;
  return (
    <>
      <dl className="service-facts service-tool-totals">
        <div>
          <dt>Dienste</dt>
          <dd>{totals.services}</dd>
        </div>
        <div>
          <dt>Personalzeit Ist</dt>
          <dd>{formatMinutes(totals.actualMinutes)}</dd>
        </div>
        <div>
          <dt>Betrag tatsächlich</dt>
          <dd>{money(totals.actualRevenue)}</dd>
        </div>
        <div>
          <dt>Hilfeleistungen</dt>
          <dd>{treatments.total ?? `${treatments.knownTotal} erfasst`}</dd>
          {treatments.missing ? (
            <small>{treatments.missing} Dienste offen</small>
          ) : null}
        </div>
      </dl>
      {totals.actualTimeMissing ? (
        <p className="service-tool-status">
          Ist-Zeiten offen: {totals.actualTimeMissing} Personen
        </p>
      ) : null}
      <details className="service-disclosure">
        <summary>Weitere Kennzahlen und Personalstunden</summary>
        <div className="service-statistics-secondary">
          <dl className="service-facts">
            <div>
              <dt>Besetzungsgrad</dt>
              <dd>
                {totals.occupancyRate == null
                  ? "Kein Bedarf erfasst"
                  : `${(totals.occupancyRate * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`}
              </dd>
            </div>
            <div>
              <dt>Besetzt / benötigt</dt>
              <dd>
                {formatMinutes(totals.coveredPersonnelMinutes)} /{" "}
                {formatMinutes(totals.requiredPersonnelMinutes)}
              </dd>
            </div>
            <div>
              <dt>Personalzeit Plan</dt>
              <dd>{formatMinutes(totals.plannedMinutes)}</dd>
            </div>
            <div>
              <dt>Betrag geplant</dt>
              <dd>{money(totals.plannedRevenue)}</dd>
            </div>
            <div>
              <dt>Betrag tatsächlich</dt>
              <dd>{money(totals.actualRevenue)}</dd>
            </div>
          </dl>
          <section>
            <h3>Medizinische Summen</h3>
            <dl className="service-facts">
              {Object.entries(totals.medical).map(([key, value]) => (
                <div key={key}>
                  <dt>{medicalLabels[key]}</dt>
                  <dd>{value.total ?? `${value.knownTotal} erfasst`}</dd>
                  {value.missing ? (
                    <small>{value.missing} Dienste offen</small>
                  ) : null}
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h3>Personalstunden</h3>
            <div className="service-scroll">
              <table className="service-simple-table">
                <thead>
                  <tr>
                    <th>Qualifikation</th>
                    <th>Plan</th>
                    <th>Ist</th>
                  </tr>
                </thead>
                <tbody>
                  {result.qualifications.map((row) => (
                    <tr key={row.qualification}>
                      <td>{qualificationLabels[row.qualification]}</td>
                      <td>{formatMinutes(row.plannedMinutes)}</td>
                      <td>
                        {formatMinutes(row.actualMinutes)}
                        {row.actualTimeMissing
                          ? ` (${row.actualTimeMissing} offen)`
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </details>
    </>
  );
}
