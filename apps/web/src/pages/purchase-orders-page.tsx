import { useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Download, Pencil, Plus, RotateCcw, ShoppingCart } from "lucide-react";
import { matchesFilterText, toOptionalString, withPrunedSearch } from "../app/filter-utils";
import { toError } from "../app/formatters";
import { ListRow, RowActions } from "../components/list-row";
import { PageHeader, PageToolbar } from "../components/page-layout";
import { ErrorPanel, LoadingPanel, MetricGrid } from "../components/state-panels";
import { StatusBadge } from "../components/status-badge";
import { AnchorButton, Button, Panel, Tabs } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import { orderKeys, orderQueries } from "../queries/orders";
import type { PurchaseOrder } from "../lib/types";
import { formatMoney } from "./purchase-orders/format";
import { PurchaseOrderFilterToolbar } from "./purchase-orders/purchase-order-filter-toolbar";
import "./purchase-orders-page.css";

type PurchaseOrderSearch = { q?: string; status?: string; view?: "active" | "archived" };

export function PurchaseOrdersPage() {
  const [mutatingOrderId, setMutatingOrderId] = useState("");
  const [mutatingAction, setMutatingAction] = useState<"archive" | "restore" | null>(null);
  const navigate = useNavigate({ from: "/admin/purchase-orders/" });
  const search = useSearch({ from: "/admin/purchase-orders/" }) as PurchaseOrderSearch;
  const queryClient = useQueryClient();
  const orders = useQuery(orderQueries.purchaseList());
  const invalidateOrders = () => queryClient.invalidateQueries({ queryKey: orderKeys.purchaseList() });
  const archive = useMutation({
    mutationFn: (id: string) => rescueBaseApi.archivePurchaseOrder(id),
    onMutate: (id) => { setMutatingOrderId(id); setMutatingAction("archive"); },
    onSettled: () => { setMutatingOrderId(""); setMutatingAction(null); },
    onSuccess: invalidateOrders
  });
  const restore = useMutation({
    mutationFn: (id: string) => rescueBaseApi.restorePurchaseOrder(id),
    onMutate: (id) => { setMutatingOrderId(id); setMutatingAction("restore"); },
    onSettled: () => { setMutatingOrderId(""); setMutatingAction(null); },
    onSuccess: invalidateOrders
  });

  if (orders.isLoading) return <LoadingPanel label="Bestellungen werden geladen" />;
  if (orders.isError || !orders.data) return <ErrorPanel error={toError(orders.error)} onRetry={() => void orders.refetch()} />;

  const activeOrders = orders.data.filter((order) => !order.archivedAt);
  const archivedOrders = orders.data.filter((order) => order.archivedAt);
  const currentView = search.view === "archived" ? "archived" : "active";
  const visibleOrders = currentView === "archived" ? archivedOrders : activeOrders;
  const filtered = visibleOrders.filter((order) =>
    (!search.status || order.status === search.status) &&
    matchesFilterText(search.q ?? "", order.orderNumber ?? "", order.supplierName ?? "", order.location.name ?? "")
  );

  function updateFilters(patch: PurchaseOrderSearch) {
    void navigate({
      replace: true,
      search: (current) => withPrunedSearch({
        ...current,
        q: toOptionalString(patch.q ?? search.q ?? ""),
        status: toOptionalString(patch.status ?? search.status ?? ""),
        view: (patch.view ?? currentView) === "archived" ? "archived" : undefined
      })
    });
  }

  return (
    <>
      <PageHeader actions={<Link className="button button-primary" to="/admin/purchase-orders/new"><Plus data-icon="inline-start" />Bestellung anlegen</Link>} title="Bestellungen" />
      <MetricGrid compact items={[
        { icon: <ShoppingCart />, label: "Aktiv", tone: "info", value: String(activeOrders.length) },
        { icon: <ShoppingCart />, label: "Archiviert", tone: "warning", value: String(archivedOrders.length) }
      ]} label="Bestellkennzahlen" />
      <Tabs
        items={[
          { label: `Aktiv (${activeOrders.length})`, value: "active" },
          { label: `Archiviert (${archivedOrders.length})`, value: "archived" }
        ]}
        label="Bestellansichten"
        onChange={(view) => updateFilters({ view: view as PurchaseOrderSearch["view"] })}
        value={currentView}
      />
      <PageToolbar label="Bestellungen filtern"><PurchaseOrderFilterToolbar countLabel={`${filtered.length}/${visibleOrders.length} sichtbar`} filters={search} onChange={updateFilters} onReset={() => void navigate({ replace: true, search: currentView === "archived" ? { view: "archived" } : {} })} /></PageToolbar>
      <Panel>
        <div className="purchase-order-list">
          {filtered.map((order) => <PurchaseOrderRow isArchiving={archive.isPending && mutatingOrderId === order.id && mutatingAction === "archive"} isRestoring={restore.isPending && mutatingOrderId === order.id && mutatingAction === "restore"} key={order.id} onArchive={() => archive.mutate(order.id)} onRestore={() => restore.mutate(order.id)} order={order} />)}
          {filtered.length === 0 ? <div className="compact-list-empty">{currentView === "archived" ? "Keine archivierten Bestellungen für die gesetzten Filter." : "Keine aktiven Bestellungen für die gesetzten Filter."}</div> : null}
        </div>
      </Panel>
    </>
  );
}

function PurchaseOrderRow(props: { isArchiving: boolean; isRestoring: boolean; onArchive: () => void; onRestore: () => void; order: PurchaseOrder }) {
  const { order } = props;
  const detailLabel = order.status === "DRAFT" ? "Bearbeiten" : "Öffnen";

  return (
    <ListRow className="purchase-order-row" actions={(
      <RowActions className="purchase-order-row-buttons">
        <Link className="button button-secondary" params={{ orderId: order.id }} to="/admin/purchase-orders/$orderId"><Pencil data-icon="inline-start" />{detailLabel}</Link>
        <AnchorButton href={rescueBaseApi.reportUrl(`/reports/purchase-orders/${order.id}.pdf`)} rel="noreferrer" target="_blank" variant="secondary"><Download data-icon="inline-start" />PDF</AnchorButton>
        {order.archivedAt
          ? <Button loading={props.isRestoring} onClick={props.onRestore} type="button" variant="secondary"><RotateCcw data-icon="inline-start" />Wiederherstellen</Button>
          : <Button loading={props.isArchiving} onClick={props.onArchive} type="button" variant="secondary"><Archive data-icon="inline-start" />Archivieren</Button>}
      </RowActions>
    )} status={<div className="purchase-order-row-status"><StatusBadge kind="purchaseOrder" status={order.status} /></div>}>
      <div className="purchase-order-row-main">
        <strong>{order.orderNumber}</strong>
        <small>{order.supplierName} · {order.location.name} · {formatMoney(order.totalGrossCents)}</small>
      </div>
    </ListRow>
  );
}
