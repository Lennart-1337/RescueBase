import { Button } from "../../../components/ui";
import { displayValue, labels, type Change } from "./changes";
import type { ReviewRow } from "./use-reconciliation";
export function ReconciliationReviewRow({
  row,
  disabled,
  onRetry,
  onSelect,
}: {
  row: ReviewRow;
  disabled: boolean;
  onRetry: () => void;
  onSelect: (key: Change["key"] | null, selected: boolean) => void;
}) {
  return (
    <section className="reconciliation-row" aria-label={row.article.name}>
      <div className="reconciliation-row-heading">
        <h3>{row.article.name}</h3>
        {row.status === "review" && row.changes.length ? (
          <label>
            <input
              type="checkbox"
              disabled={disabled}
              checked={row.changes.every((change) => change.selected)}
              onChange={(event) => onSelect(null, event.target.checked)}
            />{" "}
            Alle Änderungen dieses Artikels
          </label>
        ) : null}
      </div>
      {row.status === "pending" ? <p>Noch nicht abgeglichen</p> : null}
      {row.status === "loading" ? <p>Produktdaten werden geladen …</p> : null}
      {row.status === "saved" ? (
        <p>Ausgewählte Änderungen gespeichert</p>
      ) : null}
      {row.error ? (
        <div role="alert">
          <p>{row.error}</p>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={onRetry}
          >
            Erneut laden
          </Button>
        </div>
      ) : null}
      {row.status === "review" && !row.changes.length ? (
        <p>Keine Änderungen an den verfügbaren Produktdaten.</p>
      ) : null}
      {row.status === "review" && row.changes.length ? (
        <div className="reconciliation-fields">
          <div className="reconciliation-field-head" aria-hidden="true">
            <span>Feld übernehmen</span>
            <span>Bisher</span>
            <span>Bei Meier</span>
          </div>
          {row.changes.map((change) => (
            <div className="reconciliation-field" key={change.key}>
              <label>
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={change.selected}
                  aria-label={`${labels[change.key]} für ${row.article.name} übernehmen`}
                  onChange={(event) =>
                    onSelect(change.key, event.target.checked)
                  }
                />
                {labels[change.key]}
              </label>
              <span>
                <small>Bisher</small>
                {displayValue(change.key, change.previous)}
              </span>
              <span>
                <small>Bei Meier</small>
                {displayValue(change.key, change.next)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {row.warnings.map((warning) => (
        <p className="reconciliation-warning" key={warning}>
          {warning}
        </p>
      ))}
    </section>
  );
}
