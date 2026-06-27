import { ExternalLink, PackageCheck } from "lucide-react";
import { formatDateTime } from "../../app/formatters";
import { AnchorButton, Badge, Button, Panel } from "../../components/ui";
import type { PurchaseOrder } from "../../lib/types";
import { formatMoney, formatPurchaseStatus, purchaseStatusTone } from "./format";

export function PurchaseOrderDetailMain(props: {
  onReceive: (lineId: string, quantity: number) => void;
  order: PurchaseOrder;
}) {
  const orderedUnits = props.order.lines.reduce((sum, line) => sum + line.orderedQuantity, 0);
  const receivedUnits = props.order.lines.reduce((sum, line) => sum + line.receivedQuantity, 0);
  const openUnits = Math.max(orderedUnits - receivedUnits, 0);
  const hasRowActions = props.order.lines.some((line) => line.articleUrl || ((props.order.status === "ORDERED" || props.order.status === "PARTIALLY_RECEIVED") && line.remainingQuantity > 0));

  return (
    <div className="purchase-order-main-stack">
      <Panel className="purchase-order-summary-panel">
        <div className="purchase-order-hero">
          <div>
            <h2>{props.order.supplierName}</h2>
            <p className="purchase-order-subtitle">{props.order.location.name} · aktualisiert {formatDateTime(props.order.updatedAt)}</p>
          </div>
          <div className="purchase-order-hero-side">
            <Badge tone={purchaseStatusTone(props.order.status)}>{formatPurchaseStatus(props.order.status)}</Badge>
            <strong>{formatMoney(props.order.totalGrossCents)}</strong>
          </div>
        </div>
        <div className="purchase-order-kpis">
          <MetricCard label="Positionen" value={String(props.order.lines.length)} />
          <MetricCard label="Bestellt" value={`${orderedUnits} Stück`} />
          <MetricCard label="Offen" value={`${openUnits} Stück`} />
          <MetricCard label="Erhalten" value={`${receivedUnits} Stück`} />
        </div>
        {props.order.notes ? <p className="purchase-order-notes-inline">{props.order.notes}</p> : null}
        <div className={`purchase-order-line-list-header${hasRowActions ? "" : " purchase-order-line-list-header-compact"}`} role="presentation">
          <span>Artikel</span>
          <span>Mengen</span>
          <span>Preis</span>
          {hasRowActions ? <span>Aktion</span> : null}
        </div>
        <div className="purchase-order-line-list">
          {props.order.lines.map((line, index) => (
            <article className={`purchase-order-line-card${hasRowActions ? "" : " purchase-order-line-card-compact"}`} key={line.id}>
              <div className="purchase-order-line-cell purchase-order-line-article">
                <span className="purchase-order-line-label">Artikel</span>
                <p className="purchase-order-line-index">{index + 1}</p>
                <strong>{line.articleName}</strong>
                <span>{line.supplierArticleNumber ?? "Keine Art.-Nr."}</span>
              </div>
              <div className="purchase-order-line-cell">
                <span className="purchase-order-line-label">Mengen</span>
                <strong>{line.orderedQuantity} {line.unit}</strong>
                <span>{line.remainingQuantity} offen · {line.receivedQuantity} erhalten</span>
              </div>
              <div className="purchase-order-line-cell purchase-order-line-price">
                <span className="purchase-order-line-label">Preis</span>
                <strong>{formatMoney(line.lineTotalGrossCents)}</strong>
                <span>{formatMoney(line.grossUnitPriceCents)} / Stück</span>
              </div>
              {hasRowActions ? <div className="purchase-order-line-cell purchase-order-line-actions">{line.articleUrl ? <AnchorButton href={line.articleUrl} rel="noreferrer" target="_blank" variant="secondary"><ExternalLink data-icon="inline-start" />Link</AnchorButton> : null}{(props.order.status === "ORDERED" || props.order.status === "PARTIALLY_RECEIVED") && line.remainingQuantity > 0 ? <Button onClick={() => props.onReceive(line.id, line.remainingQuantity)} type="button" variant="secondary"><PackageCheck data-icon="inline-start" />Eingang</Button> : null}</div> : null}
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function MetricCard(props: { label: string; value: string }) {
  return <div className="purchase-order-metric-card"><span>{props.label}</span><strong>{props.value}</strong></div>;
}
