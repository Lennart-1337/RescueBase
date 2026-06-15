import { History } from "lucide-react";
import { daysUntil, formatDate } from "../../app/formatters";
import { Badge, Button, Panel } from "../../components/ui";
import type { Batch } from "../../lib/types";

export function BatchListPanel(props: { batches: Batch[]; onSelect: (id: string) => void; selectedBatchId: string | null }) {
  return (
    <Panel>
      <div className="panel-header"><div><h2>Bestandschargen</h2><p>Chargen können nur über Korrekturen angepasst werden.</p></div><Badge tone="info">{props.batches.length} erfasst</Badge></div>
      <div className="table">
        {props.batches.map((batch) => (
          <div className="table-row" key={batch.id}>
            <span><strong>{batch.article.name}</strong><small>{batch.lotNumber} · {batch.location.name}</small></span>
            <span>{batch.quantity} {batch.article.unit}</span>
            <div className="row-actions"><Badge tone={daysUntil(batch.expiresAt) <= 90 ? "danger" : "neutral"}>{formatDate(batch.expiresAt)}</Badge><Button onClick={() => props.onSelect(batch.id)} type="button" variant={props.selectedBatchId === batch.id ? "secondary" : "ghost"}><History data-icon="inline-start" />Korrigieren</Button></div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
