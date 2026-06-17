import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchesFilterText, toOptionalString, withPrunedSearch } from "../app/filter-utils";
import { AlertTriangle, Archive, ClipboardList, PackageCheck } from "lucide-react";
import { selectedBatchQuantity, useDashboardData } from "../app/dashboard-data";
import { daysUntil, formatReason, formatStatus, toError } from "../app/formatters";
import { ListFilterBar } from "../components/list-filter-bar";
import { EmptyState, ErrorPanel, LoadingPanel, Metric } from "../components/state-panels";
import { AnchorButton, Badge, Field, Panel, cn } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import { AlertSummaryPanel } from "./dashboard/alert-summary-panel";
import { OrderDetailDialog } from "./dashboard/order-detail-dialog";

export function AdminDashboard() {
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [orderOpen, setOrderOpen] = useState(false);
  const navigate = useNavigate({ from: "/" });
  const search = useSearch({ from: "/" });
  const queryClient = useQueryClient();
  const dashboard = useDashboardData();
  const fulfillMutation = useMutation({ mutationFn: ({ items, orderId }: { items: Array<{ itemId: string; batchId: string; quantity: number }>; orderId: string }) => rescueBaseApi.fulfillOrder(orderId, { items }), onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: ["orders"] }), queryClient.invalidateQueries({ queryKey: ["kits"] }), queryClient.invalidateQueries({ queryKey: ["batches"] })]) });
  const filters = {
    orderLocationId: search.orderLocationId ?? "",
    orderQ: search.orderQ ?? "",
    orderStatus: search.orderStatus ?? ""
  };

  useEffect(() => {
    if (!dashboard.data?.orders.length) return void setSelectedOrderId("");
    const firstOrder = dashboard.data.orders[0];
    if (firstOrder && !dashboard.data.orders.some((order) => order.id === selectedOrderId)) setSelectedOrderId(firstOrder.id);
  }, [dashboard.data?.orders, selectedOrderId]);

  useEffect(() => {
    if (!selectedOrderId || !dashboard.data) return;
    const locationById = new Map(dashboard.data.kits.map((kit) => [kit.id, kit.locationId]));
    const selectedStillVisible = dashboard.data.orders.some((entry) => {
      const locationId = entry.kitId ? locationById.get(entry.kitId) : undefined;
      if (filters.orderLocationId && locationId !== filters.orderLocationId) return false;
      if (filters.orderStatus && entry.status !== filters.orderStatus) return false;
      return entry.id === selectedOrderId && matchesFilterText(filters.orderQ, entry.kit?.name, entry.kit?.code);
    });
    if (!selectedStillVisible) {
      setSelectedOrderId("");
      setOrderOpen(false);
    }
  }, [dashboard.data, filters.orderLocationId, filters.orderQ, filters.orderStatus, selectedOrderId]);

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
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
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
      <header className="topbar"><div><h1>Nachfüllzentrale</h1><p>Offene Mängel, chargengenaue Teilfüllungen und Ablaufwarnungen.</p></div><div className="topbar-actions"><AnchorButton href={rescueBaseApi.reportUrl("/reports/csv/replenishment")} variant="secondary">CSV Aufträge</AnchorButton></div></header>
      <section className="metric-grid" aria-label="Kennzahlen"><Metric icon={<ClipboardList />} label="Offene Aufträge" tone="warning" value={String(openOrders)} /><Metric icon={<PackageCheck />} label="Rucksäcke bereit" tone="ready" value={`${kits.filter((kit) => kit.status === "READY").length}/${kits.length}`} /><Metric icon={<AlertTriangle />} label="Ablaufwarnungen" tone="danger" value={String(expiringBatches)} /><Metric icon={<Archive />} label="Bestand gesamt" tone="info" value={String(stockTotal)} /></section>
      <AlertSummaryPanel />
      <Panel className="orders-panel">
        <div className="panel-header"><div><h2>Nachfüllaufträge</h2><p>Teilfüllungen buchen konkrete Chargen aus dem Lager.</p></div><Badge tone="warning">{filteredOrders.length}/{orders.length} sichtbar</Badge></div>
        <ListFilterBar countLabel={`${filteredOrders.length}/${orders.length} sichtbar`} fieldsClassName="form-grid-three" onReset={resetFilters}>
          <Field label="Suche"><input onChange={(event) => updateFilters({ orderQ: event.target.value })} placeholder="Rucksackname oder Kennung" value={filters.orderQ} /></Field>
          <Field label="Standort"><select onChange={(event) => updateFilters({ orderLocationId: event.target.value })} value={filters.orderLocationId}><option value="">Alle Standorte</option>{kits.map((kit) => kit.location ? <option key={kit.location.id} value={kit.location.id}>{kit.location.name}</option> : null)}</select></Field>
          <Field label="Status"><select onChange={(event) => updateFilters({ orderStatus: event.target.value })} value={filters.orderStatus}><option value="">Alle Stati</option><option value="OPEN">Offen</option><option value="IN_PROGRESS">In Arbeit</option><option value="DONE">Erledigt</option><option value="CANCELLED">Storniert</option></select></Field>
        </ListFilterBar>
        {filteredOrders.length > 0 ? <div className="order-list">{filteredOrders.map((order) => <button className={cn("order-row", selectedOrder?.id === order.id && "selected")} key={order.id} onClick={() => { setSelectedOrderId(order.id); setOrderOpen(true); }} type="button"><span><strong>{order.kit?.name ?? order.kitId}</strong><small>{order.items.length} Positionen · {formatStatus(order.status)}</small></span><Badge tone={order.status === "OPEN" ? "warning" : order.status === "DONE" ? "ready" : "info"}>{formatStatus(order.status)}</Badge></button>)}</div> : <EmptyState text="Aktuell gibt es keine Nachfüllaufträge für die gesetzten Filter." title="Keine Nachfüllaufträge" />}
      </Panel>
      <OrderDetailDialog batches={batches} error={fulfillMutation.error ? toError(fulfillMutation.error) : null} formatReason={formatReason} formatStatus={formatStatus} isOpen={orderOpen} isSubmitting={fulfillMutation.isPending} onClose={() => setOrderOpen(false)} onFulfill={(items) => selectedOrder && fulfillMutation.mutate({ items, orderId: selectedOrder.id })} order={selectedOrder} pdfHref={selectedOrder ? rescueBaseApi.reportUrl(`/reports/replenishment/${selectedOrder.id}.pdf`) : undefined} selectedBatchQuantity={selectedBatchQuantity} />
    </>
  );
}
