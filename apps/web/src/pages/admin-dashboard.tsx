import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, ClipboardList, PackageCheck, Truck } from "lucide-react";
import { rescueBaseApi } from "../lib/api";
import type { Batch, ReplenishmentOrder } from "../lib/types";
import { AnchorButton, Badge, Button, Panel, cn } from "../components/ui";
import { Stepper } from "../components/stepper";
import {
  EmptyState,
  ErrorPanel,
  InlineError,
  LoadingPanel,
  Metric,
  daysUntil,
  formatReason,
  formatStatus,
  selectedBatchQuantity,
  statusLabels,
  toError,
  useDashboardData
} from "../app/shared";

export function AdminDashboard() {
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const queryClient = useQueryClient();
  const dashboard = useDashboardData();

  useEffect(() => {
    if (!dashboard.data?.orders.length) {
      setSelectedOrderId("");
      return;
    }
    const firstOrder = dashboard.data.orders[0];
    if (firstOrder && !dashboard.data.orders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(firstOrder.id);
    }
  }, [dashboard.data?.orders, selectedOrderId]);

  const fulfillMutation = useMutation({
    mutationFn: ({ items, orderId }: { items: Array<{ itemId: string; batchId: string; quantity: number }>; orderId: string }) =>
      rescueBaseApi.fulfillOrder(orderId, { items }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["kits"] }),
        queryClient.invalidateQueries({ queryKey: ["batches"] })
      ]);
    }
  });

  if (dashboard.isLoading) {
    return <LoadingPanel label="Dashboard wird geladen" />;
  }
  if (dashboard.isError) {
    return <ErrorPanel error={toError(dashboard.error)} onRetry={() => void dashboard.refetch()} />;
  }
  if (!dashboard.data) {
    return <LoadingPanel label="Dashboard wird geladen" />;
  }

  const { batches, kits, orders } = dashboard.data;
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0];
  const openOrders = orders.filter((order) => order.status !== "DONE" && order.status !== "CANCELLED").length;
  const expiringBatches = batches.filter((batch) => daysUntil(batch.expiresAt) <= 90).length;
  const stockTotal = batches.reduce((sum, batch) => sum + batch.quantity, 0);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Nachfüllzentrale</h1>
          <p>Offene Mängel, chargengenaue Teilfüllungen und Ablaufwarnungen.</p>
        </div>
        <div className="topbar-actions">
          <AnchorButton href={rescueBaseApi.reportUrl("/reports/csv/replenishment")} variant="secondary">
            CSV Aufträge
          </AnchorButton>
        </div>
      </header>

      <section className="metric-grid" aria-label="Kennzahlen">
        <Metric icon={<ClipboardList />} label="Offene Aufträge" tone="warning" value={String(openOrders)} />
        <Metric
          icon={<PackageCheck />}
          label="Rucksäcke bereit"
          tone="ready"
          value={`${kits.filter((kit) => kit.status === "READY").length}/${kits.length}`}
        />
        <Metric icon={<AlertTriangle />} label="Ablaufwarnungen" tone="danger" value={String(expiringBatches)} />
        <Metric icon={<Archive />} label="Bestand gesamt" tone="info" value={String(stockTotal)} />
      </section>

      <section className="workbench">
        <Panel className="orders-panel">
          <div className="panel-header">
            <div>
              <h2>Nachfüllaufträge</h2>
              <p>Teilfüllungen buchen konkrete Chargen aus dem Lager.</p>
            </div>
            <Badge tone="warning">{openOrders} offen</Badge>
          </div>
          {orders.length > 0 ? (
            <div className="order-list">
              {orders.map((order) => (
                <button
                  className={cn("order-row", selectedOrder?.id === order.id && "selected")}
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  type="button"
                >
                  <span>
                    <strong>{order.kit?.name ?? order.kitId}</strong>
                    <small>
                      {order.items.length} Positionen · {formatStatus(order.status)}
                    </small>
                  </span>
                  <Badge tone={order.status === "OPEN" ? "warning" : order.status === "DONE" ? "ready" : "info"}>
                    {formatStatus(order.status)}
                  </Badge>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState text="Aktuell gibt es keine offenen Nachfüllbedarfe." title="Keine Nachfüllaufträge" />
          )}
        </Panel>

        <Panel className="detail-panel">
          {selectedOrder ? (
            <OrderDetail
              batches={batches}
              error={fulfillMutation.error ? toError(fulfillMutation.error) : null}
              isSubmitting={fulfillMutation.isPending}
              onFulfill={(items) => fulfillMutation.mutate({ items, orderId: selectedOrder.id })}
              order={selectedOrder}
            />
          ) : (
            <EmptyState text="Sobald ein Auftrag existiert, kann er hier gebucht werden." title="Kein Auftrag ausgewählt" />
          )}
        </Panel>
      </section>
    </>
  );
}

function OrderDetail({
  batches,
  error,
  isSubmitting,
  onFulfill,
  order
}: {
  batches: Batch[];
  error: Error | null;
  isSubmitting: boolean;
  onFulfill: (items: Array<{ itemId: string; batchId: string; quantity: number }>) => void;
  order: ReplenishmentOrder;
}) {
  const [draft, setDraft] = useState<Record<string, { batchId: string; quantity: number }>>({});
  const remaining = order.items.reduce((sum, item) => sum + item.requestedQuantity - item.fulfilledQuantity, 0);
  const fulfillmentItems = Object.entries(draft)
    .filter(([, entry]) => entry.quantity > 0 && entry.batchId)
    .map(([itemId, entry]) => ({ itemId, batchId: entry.batchId, quantity: entry.quantity }));

  useEffect(() => setDraft({}), [order.id]);

  return (
    <div className="order-detail">
      <div className="panel-header">
        <div>
          <h2>{order.kit?.name ?? order.kitId}</h2>
          <p>
            {order.id} · Restmenge {remaining}
          </p>
        </div>
        <Badge tone={order.status === "OPEN" ? "warning" : order.status === "DONE" ? "ready" : "info"}>{formatStatus(order.status)}</Badge>
      </div>
      <div className="fulfillment-list">
        {order.items.map((item) => {
          const openQuantity = item.requestedQuantity - item.fulfilledQuantity;
          const availableBatches = batches
            .filter((batch) => batch.articleId === item.articleId && batch.quantity > 0)
            .sort((left, right) => left.expiresAt.localeCompare(right.expiresAt));
          const draftEntry = draft[item.templatePositionId] ?? { batchId: availableBatches[0]?.id ?? "", quantity: 0 };

          return (
            <div className="fulfillment-row" key={item.templatePositionId}>
              <div>
                <strong>{item.articleName}</strong>
                <small>
                  {item.fulfilledQuantity}/{item.requestedQuantity} {item.unit} · {formatReason(item.reason)}
                </small>
              </div>
              <select
                aria-label={`Charge für ${item.articleName}`}
                disabled={openQuantity === 0 || availableBatches.length === 0}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    [item.templatePositionId]: { ...draftEntry, batchId: event.target.value }
                  }))
                }
                value={draftEntry.batchId}
              >
                {availableBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.lotNumber} · {batch.quantity} verfügbar
                  </option>
                ))}
              </select>
              <Stepper
                label="Auffüllen"
                max={Math.min(openQuantity, selectedBatchQuantity(availableBatches, draftEntry.batchId))}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    [item.templatePositionId]: { batchId: draftEntry.batchId, quantity: value }
                  }))
                }
                value={draftEntry.quantity}
              />
            </div>
          );
        })}
      </div>
      {error ? <InlineError error={error} /> : null}
      <div className="detail-actions">
        <AnchorButton href={rescueBaseApi.reportUrl(`/reports/replenishment/${order.id}.pdf`)} variant="secondary">
          <Truck data-icon="inline-start" />
          PDF Auftrag
        </AnchorButton>
        <Button
          disabled={fulfillmentItems.length === 0 || isSubmitting || order.status === "DONE" || order.status === "CANCELLED"}
          onClick={() => onFulfill(fulfillmentItems)}
          type="button"
        >
          Teilfüllung buchen
        </Button>
      </div>
    </div>
  );
}
