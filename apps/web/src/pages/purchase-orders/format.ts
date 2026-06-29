import type { PurchaseOrderStatus } from "../../lib/types";
import { statusLabel, statusTone } from "../../components/status-badge";

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function parseCents(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return 0;
  return Math.round(Number(normalized) * 100);
}

export function centsInput(cents?: number) {
  return typeof cents === "number" ? (cents / 100).toFixed(2) : "";
}

export function formatPurchaseStatus(status: PurchaseOrderStatus) {
  return statusLabel("purchaseOrder", status);
}

export function purchaseStatusTone(status: PurchaseOrderStatus) {
  return statusTone("purchaseOrder", status);
}
