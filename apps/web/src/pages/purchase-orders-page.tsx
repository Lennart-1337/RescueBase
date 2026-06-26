import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Plus, ShoppingCart } from "lucide-react";
import { matchesFilterText, toOptionalString, withPrunedSearch } from "../app/filter-utils";
import { toError } from "../app/formatters";
import { PageHeader, PageToolbar } from "../components/page-layout";
import { ErrorPanel, LoadingPanel, Metric } from "../components/state-panels";
import { AnchorButton, Badge, Button, Field, Panel } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import type { PurchaseOrder, PurchaseOrderStatus } from "../lib/types";
import { formatMoney, formatPurchaseStatus, purchaseStatusTone } from "./purchase-orders/format";
import "./purchase-orders-page.css";

type PurchaseOrderSearch = { q?: string; status?: string };

export function PurchaseOrdersPage() {
  const navigate = useNavigate({ from: "/admin/purchase-orders" });
  const search = useSearch({ from: "/admin/purchase-orders" }) as PurchaseOrderSearch;
  const orders = useQuery({ queryKey: ["purchase-orders"], queryFn: rescueBaseApi.purchaseOrders });

  if (orders.isLoading) return <LoadingPanel label="Bestellungen werden geladen" />;
  if (orders.isError || !orders.data) return <ErrorPanel error={toError(orders.error)} onRetry={() => void orders.refetch()} />;

  const filtered = orders.data.filter((order) =>
    (!search.status || order.status === search.status) &&
    matchesFilterText(search.q ?? "", order.orderNumber ?? "", order.supplierName ?? "", order.location.name ?? "")
  );

  function updateFilters(patch: PurchaseOrderSearch) {
    void navigate({ replace: true, search: (current) => withPrunedSearch({ ...current, q: toOptionalString(patch.q ?? search.q ?? ""), status: toOptionalString(patch.status ?? search.status ?? "") }) });
  }

  return (
    <>
      <PageHeader actions={<Link className="button button-primary" to="/admin/purchase-orders/new"><Plus data-icon="inline-start" />Bestellung anlegen</Link>} title="Bestellungen" />
      <section className="metric-grid metric-grid-compact" aria-label="Bestellkennzahlen">
        <Metric icon={<ShoppingCart />} label="Bestellungen" tone="info" value={String(orders.data.length)} />
        <Metric icon={<ShoppingCart />} label="Offen" tone="warning" value={String(orders.data.filter((order) => order.status !== "RECEIVED").length)} />
      </section>
      <PageToolbar label="Bestellungen filtern">
        <div className="filter-grid">
          <Field label="Suche"><input onChange={(event) => updateFilters({ q: event.target.value })} placeholder="Nummer, Lieferant oder Zielort" value={search.q ?? ""} /></Field>
          <Field label="Status">
            <select onChange={(event) => updateFilters({ status: event.target.value })} value={search.status ?? ""}>
              <option value="">Alle Status</option>
              {(["DRAFT", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED"] as PurchaseOrderStatus[]).map((status) => (
                <option key={status} value={status}>{formatPurchaseStatus(status)}</option>
              ))}
            </select>
          </Field>
          <Button onClick={() => void navigate({ replace: true, search: {} })} type="button" variant="secondary">Zurücksetzen</Button>
        </div>
      </PageToolbar>
      <Panel>
        <div className="purchase-order-list">
          {filtered.map((order) => <PurchaseOrderRow key={order.id} order={order} />)}
          {filtered.length === 0 ? <div className="compact-list-empty">Keine Bestellungen für die gesetzten Filter.</div> : null}
        </div>
      </Panel>
    </>
  );
}

function PurchaseOrderRow({ order }: { order: PurchaseOrder }) {
  return (
    <div className="compact-list-row purchase-order-row">
      <Link className="purchase-order-row-main" params={{ orderId: order.id }} to="/admin/purchase-orders/$orderId">
        <strong>{order.orderNumber}</strong>
        <small>{order.supplierName} · {order.location.name} · {formatMoney(order.totalGrossCents)}</small>
      </Link>
      <div className="row-action-buttons">
        <Badge tone={purchaseStatusTone(order.status)}>{formatPurchaseStatus(order.status)}</Badge>
        <AnchorButton href={rescueBaseApi.reportUrl(`/reports/purchase-orders/${order.id}.pdf`)} rel="noreferrer" target="_blank" variant="secondary"><Download data-icon="inline-start" />PDF</AnchorButton>
      </div>
    </div>
  );
}
