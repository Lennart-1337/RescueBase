import { History, Trash2 } from "lucide-react";
import { daysUntil, formatDate } from "../../app/formatters";
import { InlineError } from "../../components/state-panels";
import { Badge, Button, Panel } from "../../components/ui";
import type { Batch } from "../../lib/types";

export function BatchListPanel(props: {
  batches: Batch[];
  error: Error | null;
  isSubmitting: boolean;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selectedBatchId: string | null;
  totalCount: number;
}) {

  function confirmDelete(batch: Batch) {
    if (window.confirm(`Charge "${batch.lotNumber}" wirklich löschen?`)) {
      props.onDelete(batch.id);
    }
  }

  return (
    <Panel>
      <div className="panel-header"><div><h2>Bestandschargen</h2><p>Chargen, Mengen und Ablaufdaten im aktuellen Bestand.</p></div></div>
      <div className="table">
        {props.batches.map((batch) => (
          <div className="table-row" key={batch.id}>
            <span><strong>{batch.article.name}</strong><small>{batch.lotNumber} · {batch.location.name}</small></span>
            <span>{batch.quantity} {batch.article.unit}</span>
            <div className="row-actions"><Badge tone={daysUntil(batch.expiresAt) <= 90 ? "danger" : "neutral"}>{formatDate(batch.expiresAt)}</Badge><Button onClick={() => props.onSelect(batch.id)} type="button" variant={props.selectedBatchId === batch.id ? "secondary" : "ghost"}><History data-icon="inline-start" />Korrigieren</Button><Button aria-label={`Charge ${batch.lotNumber} löschen`} disabled={props.isSubmitting} onClick={() => confirmDelete(batch)} type="button" variant="danger"><Trash2 data-icon="inline-start" />Löschen</Button></div>
          </div>
        ))}
      </div>
      {props.batches.length === 0 ? <div className="compact-list-empty">Aktuell sind keine sichtbaren Chargen vorhanden.</div> : null}
      {props.error ? <InlineError error={props.error} /> : null}
    </Panel>
  );
}
