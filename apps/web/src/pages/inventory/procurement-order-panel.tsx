import { useEffect, useState } from "react";
import { Download, ExternalLink, PackageCheck, Play, XCircle } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { AnchorButton, Badge, Button, Panel } from "../../components/ui";
import { freshReportUrl } from "../../lib/openapi-client";
import type { InventoryProcurementOrder } from "../../lib/types";

export function ProcurementOrderPanel(props: {
  error: Error | null;
  isSubmitting: boolean;
  onCancel: (order: InventoryProcurementOrder) => void;
  onReceive: (order: InventoryProcurementOrder) => void;
  onStart: (order: InventoryProcurementOrder) => void;
  orders: InventoryProcurementOrder[];
  pdfHref: string;
  totalCount: number;
}) {
  const [pdfHref, setPdfHref] = useState(() => freshProcurementPdfUrl(props.pdfHref));

  useEffect(() => {
    setPdfHref(freshProcurementPdfUrl(props.pdfHref));
  }, [props.pdfHref]);

  function refreshPdfHref() {
    const nextHref = freshProcurementPdfUrl(props.pdfHref);
    setPdfHref(nextHref);
    return nextHref;
  }

  return (
    <Panel>
      <div className="panel-header">
        <div><h2>Beschaffungsaufträge</h2></div>
        <div className="topbar-actions">
          <Badge tone="warning">{props.orders.length}/{props.totalCount} sichtbar</Badge>
          <AnchorButton
            href={pdfHref}
            onClick={(event) => {
              event.currentTarget.href = refreshPdfHref();
            }}
            variant="secondary"
          >
            <Download data-icon="inline-start" />PDF Einkaufsliste
          </AnchorButton>
        </div>
      </div>
      {props.error ? <InlineError error={props.error} /> : null}
      <div className="compact-list">
        {props.orders.map((order) => (
          <div className="compact-list-row compact-list-row-actions" key={order.id}>
            <span>
              <strong>{order.article.name}</strong>
              <small>{order.location.name} · {order.receivedQuantity}/{order.requestedQuantity} {order.article.unit} erhalten</small>
            </span>
            <div className="row-actions">
              <Badge tone={statusTone(order.status)}>{formatProcurementStatus(order.status)}</Badge>
              {(order.article.articleUrl ?? order.articleUrlSnapshot) ? <AnchorButton href={order.article.articleUrl ?? order.articleUrlSnapshot} rel="noreferrer" target="_blank" variant="secondary"><ExternalLink data-icon="inline-start" />Link</AnchorButton> : null}
              {order.status === "OPEN" ? <Button disabled={props.isSubmitting} onClick={() => props.onStart(order)} type="button" variant="secondary"><Play data-icon="inline-start" />In Bearbeitung</Button> : null}
              {order.status === "IN_PROGRESS" ? <Button disabled={props.isSubmitting} onClick={() => props.onReceive(order)} type="button"><PackageCheck data-icon="inline-start" />Wareneingang</Button> : null}
              {order.status === "OPEN" || order.status === "IN_PROGRESS" ? <Button disabled={props.isSubmitting} onClick={() => props.onCancel(order)} type="button" variant="danger"><XCircle data-icon="inline-start" />Stornieren</Button> : null}
            </div>
          </div>
        ))}
      </div>
      {props.orders.length === 0 ? <div className="compact-list-empty">Keine Beschaffungsaufträge für die gesetzten Filter.</div> : null}
    </Panel>
  );
}

function formatProcurementStatus(status: InventoryProcurementOrder["status"]) {
  if (status === "OPEN") return "Offen";
  if (status === "IN_PROGRESS") return "In Bearbeitung";
  if (status === "DONE") return "Erledigt";
  return "Storniert";
}

function statusTone(status: InventoryProcurementOrder["status"]) {
  if (status === "OPEN") return "warning";
  if (status === "IN_PROGRESS") return "info";
  if (status === "DONE") return "ready";
  return "neutral";
}

function freshProcurementPdfUrl(href: string) {
  return freshReportUrl(href);
}
