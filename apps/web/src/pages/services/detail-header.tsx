import type { ReactNode } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Button } from "../../components/ui";
import { statusLabels, type Service } from "./types";
import { berlinInput, displayTime } from "./time";
const day = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "long",
  year: "numeric",
});
const clock = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
});
function period(service: Service) {
  const start = new Date(service.startsAt),
    end = new Date(service.endsAt);
  return berlinInput(service.startsAt).slice(0, 10) ===
    berlinInput(service.endsAt).slice(0, 10)
    ? `${day.format(start)} · ${clock.format(start)}–${clock.format(end)}`
    : `${displayTime(service.startsAt)} – ${displayTime(service.endsAt)}`;
}
export function DetailHeader({
  service,
  locked,
  onBack,
  onEdit,
  children,
}: {
  service: Service;
  locked: boolean;
  onBack: () => void;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <header className="service-detail-header">
      <button type="button" className="service-back-link" onClick={onBack}>
        <ArrowLeft aria-hidden="true" size={17} />
        Dienste
      </button>
      <div className="service-detail-heading">
        <div>
          <h1>{service.title}</h1>
          <p>
            {period(service)}
            {service.location ? ` · ${service.location}` : ""}
          </p>
          <span
            className={`service-detail-status service-detail-status-${service.status.toLowerCase()}`}
          >
            {locked ? (
              <LockKeyhole aria-label="Schreibgeschützt" size={14} />
            ) : null}
            {statusLabels[service.status]}
            {service.supportOnly ? " · Unterstützung" : ""}
          </span>
        </div>
        <div className="service-detail-actions">
          {!locked ? (
            <Button variant="secondary" onClick={onEdit}>
              Bearbeiten
            </Button>
          ) : null}
          {children}
        </div>
      </div>
    </header>
  );
}
