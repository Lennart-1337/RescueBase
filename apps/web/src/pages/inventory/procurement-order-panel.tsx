import { useEffect, useState } from "react";
import { Download, ExternalLink, PackageCheck, Play, XCircle } from "lucide-react";
import { ListPagination } from "../../components/list-pagination";
import { ListRow, RowActions } from "../../components/list-row";
import { PanelHeader } from "../../components/panel-header";
import { InlineError } from "../../components/state-panels";
import { AnchorButton, Badge, Button, Panel } from "../../components/ui";
import { StatusBadge } from "../../components/status-badge";
import { freshReportUrl } from "../../lib/openapi-client";
import type { InventoryProcurementOrder } from "../../lib/types";

export function ProcurementOrderPanel(props: {
  error: Error | null;
  isSubmitting: boolean;
  onCancel: (order: InventoryProcurementOrder) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onReceive: (order: InventoryProcurementOrder) => void;
  onStart: (order: InventoryProcurementOrder) => void;
  orders: InventoryProcurementOrder[];
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  pdfHref: string;
  filteredCount: number;
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
      <PanelHeader title="Beschaffungsaufträge" actions={(
        <div className="topbar-actions">
          <Badge tone="info">{props.filteredCount}/{props.totalCount} sichtbar</Badge>
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
      )} />
      {props.error ? <InlineError error={props.error} /> : null}
      <div className="compact-list">
        {props.orders.map((order) => (
          <ListRow className="inventory-planning-row" key={order.id} title={order.article.name} meta={`${order.location.name} · ${order.receivedQuantity}/${order.requestedQuantity} ${order.article.unit} erhalten`} actions={(
            <RowActions className="inventory-planning-actions">
              <StatusBadge kind="procurementOrder" status={order.status} />
              {(order.article.articleUrl ?? order.articleUrlSnapshot) ? <AnchorButton href={order.article.articleUrl ?? order.articleUrlSnapshot} rel="noreferrer" target="_blank" variant="secondary"><ExternalLink data-icon="inline-start" />Link</AnchorButton> : null}
              {order.status === "OPEN" ? <Button disabled={props.isSubmitting} onClick={() => props.onStart(order)} type="button" variant="secondary"><Play data-icon="inline-start" />In Bearbeitung</Button> : null}
              {order.status === "IN_PROGRESS" ? <Button disabled={props.isSubmitting} onClick={() => props.onReceive(order)} type="button"><PackageCheck data-icon="inline-start" />Wareneingang</Button> : null}
              {order.status === "OPEN" || order.status === "IN_PROGRESS" ? <Button disabled={props.isSubmitting} onClick={() => props.onCancel(order)} type="button" variant="danger"><XCircle data-icon="inline-start" />Stornieren</Button> : null}
            </RowActions>
          )} />
        ))}
      </div>
      {props.orders.length === 0 ? <div className="compact-list-empty">Keine Beschaffungsaufträge für die gesetzten Filter.</div> : null}
      <ListPagination label="Beschaffungsseiten" onPageChange={props.onPageChange} onPageSizeChange={props.onPageSizeChange} page={props.page} pageSize={props.pageSize} pageSizeOptions={props.pageSizeOptions} total={props.filteredCount} />
    </Panel>
  );
}

function freshProcurementPdfUrl(href: string) {
  return freshReportUrl(href);
}
