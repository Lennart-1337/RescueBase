import { Pencil } from "lucide-react";
import type { Catalog, Service } from "./types";
export function OverviewDetails({
  service,
  catalog,
  locked,
  onEdit,
}: {
  service: Service;
  catalog: Catalog;
  locked: boolean;
  onEdit: () => void;
}) {
  const rows = [
    ["Auftraggeber", service.customer],
    ["Veranstalter", service.organizer],
    ["Ort", service.location],
    [
      "Verantwortlich",
      catalog.users.find((user) => user.id === service.responsibleId)
        ?.displayName,
    ],
    ["Ansprechpartner", service.contactName],
    ["Telefon", service.contactPhone],
  ];
  return (
    <section className="service-overview-details">
      <div className="service-overview-section-heading">
        <h2>Dienstangaben</h2>
        {!locked ? (
          <button
            type="button"
            className="service-inline-edit"
            aria-label="Dienstangaben bearbeiten"
            onClick={onEdit}
          >
            <Pencil aria-hidden="true" size={16} />
            Bearbeiten
          </button>
        ) : null}
      </div>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "–"}</dd>
          </div>
        ))}
        {service.contactEmail ? (
          <div>
            <dt>E-Mail</dt>
            <dd>
              <a href={`mailto:${service.contactEmail}`}>
                {service.contactEmail}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
