import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, ClipboardList, PackageCheck } from "lucide-react";
import { selectedBatchQuantity, useDashboardData } from "../app/dashboard-data";
import { daysUntil, formatReason, formatStatus, toError } from "../app/formatters";
import { EmptyState, ErrorPanel, LoadingPanel, Metric } from "../components/state-panels";
import { AnchorButton, Badge, Panel, cn } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import { OrderDetail } from "./dashboard/order-detail";

export function AdminDashboard() {
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const queryClient = useQueryClient();
  const dashboard = useDashboardData();
  const fulfillMutation = useMutation({
    mutationFn: ({ items, orderId }: { items: Array<{ itemId: string; batchId: string; quantity: number }>; orderId: string }) => rescueBaseApi.fulfillOrder(orderId, { items }),
    onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: ["orders"] }), queryClient.invalidateQueries({ queryKey: ["kits"] }), queryClient.invalidateQueries({ queryKey: ["batches"] })])
  });

  useEffect(() => {
    if (!dashboard.data?.orders.length) return void setSelectedOrderId("");
    const firstOrder = dashboard.data.orders[0];
    if (firstOrder && !dashboard.data.orders.some((order) => order.id === selectedOrderId)) setSelectedOrderId(firstOrder.id);
  }, [dashboard.data?.orders, selectedOrderId]);

  if (dashboard.isLoading) return <LoadingPanel label="Dashboard wird geladen" />;
  if (dashboard.isError) return <ErrorPanel error={toError(dashboard.error)} onRetry={() => void dashboard.refetch()} />;
  if (!dashboard.data) return <LoadingPanel label="Dashboard wird geladen" />;

  const { batches, kits, orders } = dashboard.data;
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0];
  const openOrders = orders.filter((order) => order.status !== "DONE" && order.status !== "CANCELLED").length;
  const expiringBatches = batches.filter((batch) => daysUntil(batch.expiresAt) <= 90).length;
  const stockTotal = batches.reduce((sum, batch) => sum + batch.quantity, 0);

  return (
    <>
      <header className="topbar"><div><h1>Nachfüllzentrale</h1><p>Offene Mängel, chargengenaue Teilfüllungen und Ablaufwarnungen.</p></div><div className="topbar-actions"><AnchorButton href={rescueBaseApi.reportUrl("/reports/csv/replenishment")} variant="secondary">CSV Aufträge</AnchorButton></div></header>
      <section className="metric-grid" aria-label="Kennzahlen">
        <Metric icon={<ClipboardList />} label="Offene Aufträge" tone="warning" value={String(openOrders)} />
        <Metric icon={<PackageCheck />} label="Rucksäcke bereit" tone="ready" value={`${kits.filter((kit) => kit.status === "READY").length}/${kits.length}`} />
        <Metric icon={<AlertTriangle />} label="Ablaufwarnungen" tone="danger" value={String(expiringBatches)} />
        <Metric icon={<Archive />} label="Bestand gesamt" tone="info" value={String(stockTotal)} />
      </section>
      <section className="workbench">
        <Panel className="orders-panel">
          <div className="panel-header"><div><h2>Nachfüllaufträge</h2><p>Teilfüllungen buchen konkrete Chargen aus dem Lager.</p></div><Badge tone="warning">{openOrders} offen</Badge></div>
          {orders.length > 0 ? <div className="order-list">{orders.map((order) => <button className={cn("order-row", selectedOrder?.id === order.id && "selected")} key={order.id} onClick={() => setSelectedOrderId(order.id)} type="button"><span><strong>{order.kit?.name ?? order.kitId}</strong><small>{order.items.length} Positionen · {formatStatus(order.status)}</small></span><Badge tone={order.status === "OPEN" ? "warning" : order.status === "DONE" ? "ready" : "info"}>{formatStatus(order.status)}</Badge></button>)}</div> : <EmptyState text="Aktuell gibt es keine offenen Nachfüllbedarfe." title="Keine Nachfüllaufträge" />}
        </Panel>
        <Panel className="detail-panel">
          {selectedOrder ? <OrderDetail batches={batches} error={fulfillMutation.error ? toError(fulfillMutation.error) : null} formatReason={formatReason} formatStatus={formatStatus} isSubmitting={fulfillMutation.isPending} onFulfill={(items) => fulfillMutation.mutate({ items, orderId: selectedOrder.id })} order={selectedOrder} selectedBatchQuantity={selectedBatchQuantity} /> : <EmptyState text="Sobald ein Auftrag existiert, kann er hier gebucht werden." title="Kein Auftrag ausgewählt" />}
        </Panel>
      </section>
    </>
  );
}
