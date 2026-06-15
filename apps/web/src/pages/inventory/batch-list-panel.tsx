import { useMemo, useState } from "react";
import { History, Plus } from "lucide-react";
import { daysUntil, formatDate } from "../../app/formatters";
import { Badge, Button, Panel } from "../../components/ui";
import type { Batch } from "../../lib/types";

export function BatchListPanel(props: { batches: Batch[]; onCreate: () => void; onSelect: (id: string) => void; selectedBatchId: string | null }) {
  const [showEmptyBatches, setShowEmptyBatches] = useState(false);
  const visibleBatches = useMemo(() => showEmptyBatches ? props.batches : props.batches.filter((batch) => batch.quantity > 0), [props.batches, showEmptyBatches]);

  return (
    <Panel>
      <div className="panel-header"><div><h2>Bestandschargen</h2><p>Leere Chargen bleiben historisch erhalten und können bei Bedarf eingeblendet werden.</p></div><div className="topbar-actions"><Badge tone="info">{visibleBatches.length}/{props.batches.length} sichtbar</Badge><Button onClick={props.onCreate} type="button"><Plus data-icon="inline-start" />Charge hinzufügen</Button></div></div>
      <label className="check-field"><input checked={showEmptyBatches} onChange={(event) => setShowEmptyBatches(event.target.checked)} type="checkbox" /><span>Chargen mit Menge 0 anzeigen</span></label>
      <div className="table">
        {visibleBatches.map((batch) => (
          <div className="table-row" key={batch.id}>
            <span><strong>{batch.article.name}</strong><small>{batch.lotNumber} · {batch.location.name}</small></span>
            <span>{batch.quantity} {batch.article.unit}</span>
            <div className="row-actions"><Badge tone={daysUntil(batch.expiresAt) <= 90 ? "danger" : "neutral"}>{formatDate(batch.expiresAt)}</Badge><Button onClick={() => props.onSelect(batch.id)} type="button" variant={props.selectedBatchId === batch.id ? "secondary" : "ghost"}><History data-icon="inline-start" />Korrigieren</Button></div>
          </div>
        ))}
      </div>
      {visibleBatches.length === 0 ? <div className="compact-list-empty">Aktuell sind keine sichtbaren Chargen vorhanden.</div> : null}
    </Panel>
  );
}
