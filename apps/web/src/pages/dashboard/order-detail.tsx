import { useEffect, useState } from "react";
import { Download, Truck } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { AnchorButton, Badge, Button } from "../../components/ui";
import { Stepper } from "../../components/stepper";
import type { Batch, ReplenishmentOrder } from "../../lib/types";

export function OrderDetail(props: {
  batches: Batch[];
  error: Error | null;
  formatReason: (reason: string) => string;
  formatStatus: (status: string) => string;
  isSubmitting: boolean;
  onFulfill: (items: Array<{ itemId: string; batchId: string; quantity: number }>) => void;
  order: ReplenishmentOrder;
  pdfHref: string;
  selectedBatchQuantity: (batches: Batch[], batchId: string) => number;
}) {
  const [draft, setDraft] = useState<Record<string, { batchId: string; quantity: number }>>({});
  const remaining = props.order.items.reduce((sum, item) => sum + item.requestedQuantity - item.fulfilledQuantity, 0);
  const fulfillmentItems = Object.entries(draft).filter(([, entry]) => entry.quantity > 0 && entry.batchId).map(([itemId, entry]) => ({ itemId, batchId: entry.batchId, quantity: entry.quantity }));
  useEffect(() => setDraft({}), [props.order.id]);

  return (
    <div className="order-detail">
      <div className="panel-header">
        <div><h2>{props.order.kit?.name ?? props.order.kitId}</h2><p>{props.order.id} · Restmenge {remaining}</p></div>
        <div className="topbar-actions">
          <AnchorButton href={props.pdfHref} variant="secondary"><Download data-icon="inline-start" />PDF</AnchorButton>
          <Badge tone={props.order.status === "OPEN" ? "warning" : props.order.status === "DONE" ? "ready" : "info"}>{props.formatStatus(props.order.status)}</Badge>
        </div>
      </div>
      <div className="fulfillment-list">
        {props.order.items.map((item) => {
          const openQuantity = item.requestedQuantity - item.fulfilledQuantity;
          const availableBatches = props.batches.filter((batch) => batch.articleId === item.articleId && batch.quantity > 0).sort((left, right) => left.expiresAt.localeCompare(right.expiresAt));
          const draftEntry = draft[item.templatePositionId] ?? { batchId: availableBatches[0]?.id ?? "", quantity: 0 };
          return (
            <div className="fulfillment-row" key={item.templatePositionId}>
              <div><strong>{item.articleName}</strong><small>{item.fulfilledQuantity}/{item.requestedQuantity} {item.unit} · {props.formatReason(item.reason)}</small></div>
              <select aria-label={`Charge für ${item.articleName}`} disabled={openQuantity === 0 || availableBatches.length === 0} onChange={(event) => setDraft((current) => ({ ...current, [item.templatePositionId]: { ...draftEntry, batchId: event.target.value } }))} value={draftEntry.batchId}>{availableBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.lotNumber} · {batch.quantity} verfügbar</option>)}</select>
              <Stepper label="Auffüllen" max={Math.min(openQuantity, props.selectedBatchQuantity(availableBatches, draftEntry.batchId))} onChange={(value) => setDraft((current) => ({ ...current, [item.templatePositionId]: { batchId: draftEntry.batchId, quantity: value } }))} value={draftEntry.quantity} />
            </div>
          );
        })}
      </div>
      {props.error ? <InlineError error={props.error} /> : null}
      <div className="form-actions"><Truck data-icon="inline-start" /><Button disabled={fulfillmentItems.length === 0 || props.isSubmitting || props.order.status === "DONE" || props.order.status === "CANCELLED"} onClick={() => props.onFulfill(fulfillmentItems)} type="button">Teilfüllung buchen</Button></div>
    </div>
  );
}
