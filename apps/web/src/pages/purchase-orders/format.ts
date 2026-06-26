import type { PurchaseOrderStatus } from "../../lib/types";

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
  if (status === "DRAFT") return "Entwurf";
  if (status === "APPROVED") return "Freigegeben";
  if (status === "ORDERED") return "Bestellt";
  if (status === "PARTIALLY_RECEIVED") return "Teilweise erhalten";
  return "Erhalten";
}

export function purchaseStatusTone(status: PurchaseOrderStatus) {
  if (status === "DRAFT") return "warning" as const;
  if (status === "RECEIVED") return "ready" as const;
  return "info" as const;
}
