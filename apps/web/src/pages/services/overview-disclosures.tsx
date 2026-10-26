import { ChevronRight, TriangleAlert } from "lucide-react";
import { displayTime } from "./time";
import { warningLabel } from "./warning-label";
import type { Catalog, Service } from "./types";
const warningSummaries: Record<string, string> = {
  UNDERSTAFFED: "Personal unvollständig",
  QUALIFICATION: "Nachweise offen",
  LEADERSHIP: "Führungsnachweis offen",
  PERSON_CONFLICT: "Personal doppelt eingeplant",
  RESOURCE_CONFLICT: "Ressource doppelt reserviert",
  DUPLICATE_RESOURCE: "Ressource mehrfach reserviert",
  RESOURCE_NOT_READY: "Einsatzbereitschaft offen",
  NO_POSITIONS: "Personalbedarf offen",
};
export function OverviewDisclosures({
  service,
  catalog,
}: {
  service: Service;
  catalog: Catalog;
}) {
  return (
    <>
      <div className="service-overview-disclosures">
        <details>
          <summary>
            <ChevronRight
              className="service-disclosure-chevron"
              aria-hidden="true"
              size={15}
            />
            Auftrag und Anforderungen
          </summary>
          <dl>
            {[
              ["Veranstaltungsart", service.eventType],
              ["Federführender Verband", service.leadOrganization],
              ["Auftrag", service.description],
              ["Anforderungen", service.requirements],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        </details>
        {service.warnings.length ? (
          <details className="service-overview-warning">
            <summary>
              <ChevronRight
                className="service-disclosure-chevron"
                aria-hidden="true"
                size={15}
              />
              <TriangleAlert aria-hidden="true" size={17} />
              {service.warnings.length}{" "}
              {service.warnings.length === 1
                ? "Planungshinweis"
                : "Planungshinweise"}
              {service.warnings.find(
                (warning) => warningSummaries[warning.code],
              ) ? (
                <span className="service-warning-summary">
                  {
                    warningSummaries[
                      service.warnings.find(
                        (warning) => warningSummaries[warning.code],
                      )!.code
                    ]
                  }
                </span>
              ) : null}
            </summary>
            <ul>
              {service.warnings.map((warning, index) => (
                <li key={`${warning.code}-${index}`}>
                  {warningLabel(warning, service, catalog)}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
      {service.releases.length ? (
        <details className="service-release-history">
          <summary>
            <ChevronRight
              className="service-disclosure-chevron"
              aria-hidden="true"
              size={15}
            />
            Freigabehistorie <span>{service.releases.length}</span>
          </summary>
          {service.releases.map((release) => (
            <article key={release.id}>
              <strong>{displayTime(release.createdAt)}</strong>
              {release.reason ? <p>{release.reason}</p> : null}
              {release.warnings.length ? (
                <ul>
                  {release.warnings.map((warning, index) => (
                    <li key={index}>{warning.message}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </details>
      ) : null}
    </>
  );
}
