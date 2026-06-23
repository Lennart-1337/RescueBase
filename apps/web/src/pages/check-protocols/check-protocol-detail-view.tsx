import {
  formatDateTime,
  formatStatus,
  statusLabels,
} from "../../app/formatters";
import { Badge } from "../../components/ui";
import type { CheckProtocolDetail } from "../../lib/types";
import { protocolStatusTone } from "./check-protocol-status";

export function CheckProtocolDetailView({
  detail,
}: {
  detail: CheckProtocolDetail;
}) {
  return (
    <div className="protocol-detail-shell">
      <header className="protocol-hero">
        <div className="protocol-hero-copy">
          <p className="protocol-eyebrow">Abgeschlossener Rucksackcheck</p>
          <h3>
            {detail.kit.name} · {detail.kit.code}
          </h3>
          <small className="protocol-meta">
            {detail.checkerName} · {formatDateTime(detail.createdAt)}
          </small>
        </div>
        <div className="protocol-hero-badges">
          <Badge
            className="protocol-badge-state"
            tone={protocolStatusTone(detail.effectiveStatus)}
          >
            {statusLabels[detail.effectiveStatus]}
          </Badge>
          <Badge
            className="protocol-badge-state"
            tone={detail.warnings.length > 0 ? "warning" : "ready"}
          >
            {detail.warnings.length} Hinweise
          </Badge>
        </div>
      </header>
      <div className="protocol-detail-layout">
        <div className="protocol-detail-main">
          <section className="protocol-card">
            <div className="protocol-card-header">
              <h3>Prüfstatus</h3>
              <p>Kernaussagen und Zählwerte des abgeschlossenen Checks.</p>
            </div>
            <div className="protocol-summary-grid">
              <Summary label="Geprüft von" value={detail.checkerName} />
              <Summary
                label="Zeitpunkt"
                value={formatDateTime(detail.createdAt)}
              />
              <Summary
                label="Ergebnis"
                value={statusLabels[detail.effectiveStatus]}
              />
              <Summary
                label="Positionen"
                value={`${detail.positions.length} erfasst`}
              />
            </div>
          </section>
          {detail.warnings.length > 0 ? (
            <section className="protocol-card">
              <div className="protocol-card-header">
                <h3>Hinweise</h3>
                <p>Automatisch erkannte Auffälligkeiten aus diesem Check.</p>
              </div>
              <ul
                aria-label="Hinweise"
                className="protocol-warning-list"
              >
                {detail.warnings.map((warning) => (
                  <li className="protocol-warning" key={warning}>
                    {warning}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="protocol-card">
            <div className="protocol-card-header">
              <h3>Positionen</h3>
              <p>
                Gezählte Inhalte, Abweichungen und vermerkte Besonderheiten.
              </p>
            </div>
            <ul
              aria-label="Positionen"
              className="protocol-position-list"
            >
              {detail.positions.map((position) => (
                <PositionCard key={position.id} position={position} />
              ))}
            </ul>
          </section>
        </div>
        <aside className="protocol-detail-rail">
          <section className="protocol-card protocol-card-compact">
            <div className="protocol-card-header">
              <h3>Signatur</h3>
              <p>Digitale Unterschrift und Prüfnachweis.</p>
            </div>
            <img
              alt={`Unterschrift von ${detail.checkerName}`}
              className="protocol-signature-image"
              src={detail.signaturePngDataUrl}
            />
            <div className="protocol-hash-block">
              <span>Hashwert</span>
              <code>{detail.signatureHash}</code>
            </div>
          </section>
          {detail.replenishmentOrder ? (
            <section className="protocol-card protocol-card-compact">
              <div className="protocol-card-header">
                <h3>Verknüpfter Nachfüllauftrag</h3>
                <p>Folgeauftrag aus diesem Check.</p>
              </div>
              <div className="protocol-order-card">
                <strong>{detail.replenishmentOrder.id}</strong>
                <Badge
                  className="protocol-badge-state"
                  tone={
                    detail.replenishmentOrder.status === "OPEN"
                      ? "warning"
                      : detail.replenishmentOrder.status === "DONE"
                        ? "ready"
                        : "info"
                  }
                >
                  {formatStatus(detail.replenishmentOrder.status)}
                </Badge>
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function PositionCard({
  position,
}: {
  position: CheckProtocolDetail["positions"][number];
}) {
  const issues = [
    position.missingQuantity > 0 ? (
      <Badge className="protocol-badge-issue" key="missing" tone="warning">
        Fehlt {position.missingQuantity}
      </Badge>
    ) : null,
    position.discardedExpiredQuantity > 0 ? (
      <Badge className="protocol-badge-issue" key="discarded" tone="danger">
        Verworfen {position.discardedExpiredQuantity}
      </Badge>
    ) : null,
    position.surplusQuantity > 0 ? (
      <Badge className="protocol-badge-issue" key="surplus" tone="info">
        Über {position.surplusQuantity}
      </Badge>
    ) : null,
    position.critical ? (
      <Badge className="protocol-badge-issue" key="critical" tone="danger">
        Kritisch
      </Badge>
    ) : null,
  ].filter(Boolean);

  return (
    <li className="protocol-position-card">
      <div className="protocol-position-copy">
        <strong>{position.articleName}</strong>
        <small className="protocol-position-meta">
          {position.moduleName ?? "Ohne Modul"}
          {position.note ? ` · ${position.note}` : ""}
        </small>
      </div>
      <div className="protocol-position-badges">
        <div className="protocol-position-badge-column">
          <Badge className="protocol-badge-data" tone="neutral">
            Soll {position.requiredQuantity}
          </Badge>
        </div>
        <div className="protocol-position-badge-column">
          <Badge className="protocol-badge-data" tone="info">
            Gezählt {position.countedQuantity}
          </Badge>
        </div>
        <div className="protocol-position-badge-column protocol-position-badge-column-issues">
          {issues}
        </div>
      </div>
    </li>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="protocol-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
