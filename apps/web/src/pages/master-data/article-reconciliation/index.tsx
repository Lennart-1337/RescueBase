import { useState } from "react";
import { Button, Dialog } from "../../../components/ui";
import type { Article } from "../../../lib/types";
import { isMeierArticle } from "./changes";
import { ReconciliationReviewRow } from "./review-row";
import { useReconciliation } from "./use-reconciliation";
import "./reconciliation.css";
export function ArticleReconciliation({
  articles,
  onApplied,
}: {
  articles: Article[];
  onApplied: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const linked = articles.filter(isMeierArticle);
  const state = useReconciliation(linked, onApplied);
  const busy = state.loading || state.applying;
  const selected = state.rows.reduce(
    (count, row) =>
      count + row.changes.filter((change) => change.selected).length,
    0,
  );
  const reviewed = state.rows.filter((row) =>
    ["review", "error", "saved"].includes(row.status),
  ).length;
  const changed = state.rows.filter(
    (row) => row.status === "review" && row.changes.length,
  ).length;
  function close() {
    if (state.applying) return;
    state.stop();
    setOpen(false);
  }
  return (
    <>
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        Meier-Bestandsabgleich
      </Button>
      <Dialog
        open={open}
        onClose={close}
        size="wide"
        title="Meier-Bestandsabgleich"
        description="Alle verknüpften Meier-Artikel werden unabhängig vom Suchfilter geprüft. Erst die ausgewählten Änderungen werden gespeichert."
        bodyClassName="reconciliation-body"
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              disabled={state.applying}
              onClick={close}
            >
              Schließen
            </Button>
            {state.loading ? (
              <Button type="button" variant="ghost" onClick={state.stop}>
                Abgleich stoppen
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={busy || !selected}
              loading={state.applying}
              onClick={() => void state.apply()}
            >
              Ausgewählte Änderungen übernehmen ({selected})
            </Button>
          </>
        }
      >
        <div className="reconciliation-toolbar">
          <p>{linked.length} verknüpfte Meier-Artikel</p>
          <Button
            type="button"
            disabled={busy || !linked.length}
            onClick={() => void state.load()}
          >
            Abgleich starten
          </Button>
        </div>
        {!linked.length ? (
          <p>
            Es sind keine Artikel mit einem gültigen Meier-Produktlink
            vorhanden.
          </p>
        ) : null}
        {state.rows.length ? (
          <>
            <p role="status">
              {reviewed}/{state.rows.length} geprüft · {changed} Artikel mit
              Änderungen · {selected} Felder ausgewählt
            </p>
            <label className="reconciliation-select-all">
              <input
                type="checkbox"
                disabled={busy || !changed}
                checked={
                  Boolean(changed) &&
                  state.rows
                    .filter((row) => row.status === "review")
                    .every((row) =>
                      row.changes.every((change) => change.selected),
                    )
                }
                onChange={(event) =>
                  state.select(null, null, event.target.checked)
                }
              />{" "}
              Alle verfügbaren Änderungen auswählen
            </label>
          </>
        ) : null}
        {state.notice ? <p role="status">{state.notice}</p> : null}
        {state.rows.map((row) => (
          <ReconciliationReviewRow
            key={row.article.id}
            row={row}
            disabled={busy}
            onRetry={() => void state.load([row.article])}
            onSelect={(key, checked) =>
              state.select(row.article.id, key, checked)
            }
          />
        ))}
      </Dialog>
    </>
  );
}
