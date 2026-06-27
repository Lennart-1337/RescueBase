import { Download, FileText, PencilLine, Save, Send } from "lucide-react";
import { formatDateTime } from "../../app/formatters";
import { AnchorButton, Badge, Button, Panel } from "../../components/ui";
import type { PurchaseOrder } from "../../lib/types";
import { formatPurchaseStatus, purchaseStatusTone } from "./format";

export function PurchaseOrderDetailRail(props: {
  canApprove: boolean;
  includeLineNotes: boolean;
  isApproving: boolean;
  isOrdering: boolean;
  onApprove: () => void;
  onEdit: () => void;
  onIncludeNotesChange: (checked: boolean) => void;
  onMarkOrdered: () => void;
  order: PurchaseOrder;
  pdfHref: string;
}) {
  return (
    <div className="purchase-order-rail-stack">
      <Panel className="purchase-order-control-panel">
        <div className="panel-header">
          <div>
            <h2>Bestellsteuerung</h2>
            <p>Status, Aktionen und Export an einem Ort.</p>
          </div>
          <Badge tone={purchaseStatusTone(props.order.status)}>{formatPurchaseStatus(props.order.status)}</Badge>
        </div>
        <div className="purchase-order-form">
          {props.canApprove ? <Button disabled={props.isApproving} onClick={props.onApprove} type="button"><Save data-icon="inline-start" />Freigeben</Button> : null}
          {props.order.status === "APPROVED" ? <Button disabled={props.isOrdering} onClick={props.onMarkOrdered} type="button"><Send data-icon="inline-start" />Als bestellt markieren</Button> : null}
          <Button onClick={props.onEdit} type="button" variant="secondary"><PencilLine data-icon="inline-start" />{props.order.status === "DRAFT" ? "Bestellung bearbeiten" : "Hinweise bearbeiten"}</Button>
        </div>
        <div className="purchase-order-timeline">
          <TimelineRow label="Angelegt" value={formatDateTime(props.order.createdAt)} />
          <TimelineRow label="Freigegeben" value={props.order.approvedAt ? `${formatDateTime(props.order.approvedAt)} · ${props.order.approvedByName ?? "Unbekannt"}` : "Noch nicht freigegeben"} />
          <TimelineRow label="Bestellt" value={props.order.orderedAt ? formatDateTime(props.order.orderedAt) : "Noch nicht bestellt"} />
          <TimelineRow label="Wareneingang" value={props.order.receivedAt ? formatDateTime(props.order.receivedAt) : "Noch nicht abgeschlossen"} />
        </div>
        <div className="purchase-order-documents">
          <label className="check-field">
            <input checked={props.includeLineNotes} onChange={(event) => props.onIncludeNotesChange(event.target.checked)} type="checkbox" />
            <span>Positionsnotizen im PDF anzeigen</span>
          </label>
          <AnchorButton href={props.pdfHref} rel="noreferrer" target="_blank" variant="secondary"><Download data-icon="inline-start" />PDF exportieren</AnchorButton>
          <div className="purchase-order-doc-hint"><FileText data-icon="inline-start" /><span>PDF enthält Artikel, Preise, Link je Artikel und Gesamtsumme.</span></div>
        </div>
      </Panel>
    </div>
  );
}

function TimelineRow(props: { label: string; value: string }) {
  return <div className="purchase-order-timeline-row"><span>{props.label}</span><strong>{props.value}</strong></div>;
}
