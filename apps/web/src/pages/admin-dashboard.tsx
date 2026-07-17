import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchesFilterText, toOptionalString, withPrunedSearch } from "../app/filter-utils";
import { AlertTriangle, Archive, ClipboardList, PackageCheck } from "lucide-react";
import { selectedBatchQuantity, useDashboardData } from "../app/dashboard-data";
import { daysUntil, formatReason, formatStatus, toError } from "../app/formatters";
import { PanelHeader } from "../components/panel-header";
import { PageHeader, PageToolbar, Workspace, WorkspaceMain, WorkspaceRail } from "../components/page-layout";
import { EmptyState, ErrorPanel, LoadingPanel, MetricGrid } from "../components/state-panels";
import { StatusBadge } from "../components/status-badge";
import { Panel } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import { catalogKeys } from "../queries/catalog";
import { inventoryKeys } from "../queries/inventory";
import { orderKeys } from "../queries/orders";
import { AlertSummaryPanel } from "./dashboard/alert-summary-panel";
import { OrderFilterToolbar } from "./dashboard/order-filter-toolbar";
import { OrderDetailDialog } from "./dashboard/order-detail-dialog";
import "./dashboard/order-layout.css";

export function AdminDashboard() {
  const [activeOrderId, setActiveOrderId] = useState("");
  const [orderOpen, setOrderOpen] = useState(false);
  const navigate = useNavigate({ from: "/" });
  const search = useSearch({ from: "/" });
  const queryClient = useQueryClient();
  const dashboard = useDashboardData();
  const invalidateOrderData = () => queryClient.invalidateQueries({ queryKey: orderKeys.replenishmentList() });
  const cancelMutation = useMutation({ mutationFn: rescueBaseApi.cancelOrder, onSuccess: invalidateOrderData });
  const fulfillMutation = useMutation({ mutationFn: ({ items, orderId }: { items: Array<{ itemId: string; batchId: string; quantity: number }>; orderId: string }) => rescueBaseApi.fulfillOrder(orderId, { items }), onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: orderKeys.replenishmentList() }), queryClient.invalidateQueries({ queryKey: catalogKeys.kits() }), queryClient.invalidateQueries({ queryKey: inventoryKeys.batches() })]) });
  const filters = {
    orderLocationId: search.orderLocationId ?? "",
    orderQ: search.orderQ ?? "",
    orderStatus: search.orderStatus ?? ""
  };

  useEffect(() => {
    if (!activeOrderId || !dashboard.data) return;
    const locationById = new Map(dashboard.data.kits.map((kit) => [kit.id, kit.locationId]));
    const activeOrderStillVisible = dashboard.data.orders.some((entry) => {
      const locationId = entry.kitId ? locationById.get(entry.kitId) : undefined;
      if (filters.orderLocationId && locationId !== filters.orderLocationId) return false;
      if (filters.orderStatus && entry.status !== filters.orderStatus) return false;
      return entry.id === activeOrderId && matchesFilterText(filters.orderQ, entry.kit?.name, entry.kit?.code);
    });
    if (!activeOrderStillVisible) {
      setActiveOrderId("");
      setOrderOpen(false);
    }
  }, [activeOrderId, dashboard.data, filters.orderLocationId, filters.orderQ, filters.orderStatus]);

  if (dashboard.isLoading) return <LoadingPanel label="Dashboard wird geladen" />;
  if (dashboard.isError) return <ErrorPanel error={toError(dashboard.error)} onRetry={() => void dashboard.refetch()} />;
  if (!dashboard.data) return <LoadingPanel label="Dashboard wird geladen" />;

  const { batches, kits, orders } = dashboard.data;
  const kitLocationById = new Map(kits.map((kit) => [kit.id, kit.locationId]));
  const filteredOrders = orders.filter((entry) => {
    const locationId = entry.kitId ? kitLocationById.get(entry.kitId) : undefined;
    if (filters.orderLocationId && locationId !== filters.orderLocationId) return false;
    if (filters.orderStatus && entry.status !== filters.orderStatus) return false;
    return matchesFilterText(filters.orderQ, entry.kit?.name, entry.kit?.code);
  });
  const activeOrder = orders.find((order) => order.id === activeOrderId) ?? null;
  const openOrders = orders.filter((order) => order.status !== "DONE" && order.status !== "CANCELLED").length;
  const expiringBatches = batches.filter((batch) => daysUntil(batch.expiresAt) <= 90).length;
  const stockTotal = batches.reduce((sum, batch) => sum + batch.quantity, 0);

  function updateFilters(patch: Partial<typeof filters>) {
    void navigate({
      replace: true,
      search: (current) => withPrunedSearch({
        ...current,
        orderLocationId: toOptionalString(patch.orderLocationId ?? filters.orderLocationId),
        orderQ: toOptionalString(patch.orderQ ?? filters.orderQ),
        orderStatus: toOptionalString(patch.orderStatus ?? filters.orderStatus)
      })
    });
  }

  function resetFilters() {
    void navigate({
      replace: true,
      search: () => ({})
    });
  }

  return (
    <>
      <PageHeader title="Nachfüllaufträge" />
      <MetricGrid items={[
        { icon: <ClipboardList />, label: "Offene Aufträge", tone: "warning", value: String(openOrders) },
        { icon: <PackageCheck />, label: "Rucksäcke bereit", tone: "ready", value: `${kits.filter((kit) => kit.status === "READY").length}/${kits.length}` },
        { icon: <AlertTriangle />, label: "Ablaufwarnungen", tone: "danger", value: String(expiringBatches) },
        { icon: <Archive />, label: "Bestand gesamt", tone: "info", value: String(stockTotal) }
      ]} label="Kennzahlen" />
      <PageToolbar label="Aufträge filtern"><OrderFilterToolbar countLabel={`${filteredOrders.length}/${orders.length} sichtbar`} filters={filters} kits={kits} onChange={updateFilters} onReset={resetFilters} /></PageToolbar>
      <Workspace>
        <WorkspaceMain label="Nachfüllaufträge"><Panel className="orders-panel"><PanelHeader title="Auftragsliste" />{filteredOrders.length > 0 ? <div className="order-list">{filteredOrders.map((order) => <button className="order-row" key={order.id} onClick={() => { setActiveOrderId(order.id); setOrderOpen(true); }} type="button"><span><strong>{order.kit?.name ?? order.kitId}</strong><small>{order.items.length} Positionen · {formatStatus(order.status)}</small></span><StatusBadge kind="replenishment" status={order.status} /></button>)}</div> : <EmptyState text="Aktuell gibt es keine Nachfüllaufträge für die gesetzten Filter." title="Keine Nachfüllaufträge" />}</Panel></WorkspaceMain>
        <WorkspaceRail label="Warnungen"><AlertSummaryPanel /></WorkspaceRail>
      </Workspace>
      <OrderDetailDialog batches={batches} error={cancelMutation.error || fulfillMutation.error ? toError(cancelMutation.error ?? fulfillMutation.error) : null} formatReason={formatReason} formatStatus={formatStatus} isCancelling={cancelMutation.isPending} isFulfilling={fulfillMutation.isPending} isOpen={orderOpen} onCancel={() => activeOrder && cancelMutation.mutate(activeOrder.id)} onClose={() => { setOrderOpen(false); setActiveOrderId(""); }} onFulfill={(items) => activeOrder && fulfillMutation.mutate({ items, orderId: activeOrder.id })} order={activeOrder} pdfHref={activeOrder ? rescueBaseApi.reportUrl(`/reports/replenishment/${activeOrder.id}.pdf`) : undefined} selectedBatchQuantity={selectedBatchQuantity} />
    </>
  );
}
