import type { BadgeTone } from "./badge";
import { Badge } from "./badge";
import type { KitOperationalStatus, PurchaseOrderStatus, ReplenishmentStatus } from "../lib/types";

type StatusKind = "kit" | "purchaseOrder" | "replenishment";

const labels = {
  kit: {
    CONDITIONAL: "Bedingt einsatzbereit",
    NOT_READY: "Nicht einsatzbereit",
    READY: "Bereit"
  },
  purchaseOrder: {
    APPROVED: "Freigegeben",
    DRAFT: "Entwurf",
    ORDERED: "Bestellt",
    PARTIALLY_RECEIVED: "Teilweise erhalten",
    RECEIVED: "Erhalten"
  },
  replenishment: {
    CANCELLED: "Storniert",
    DONE: "Erledigt",
    OPEN: "Offen"
  }
} satisfies Record<StatusKind, Record<string, string>>;

const tones = {
  kit: { CONDITIONAL: "warning", NOT_READY: "danger", READY: "ready" },
  purchaseOrder: { APPROVED: "info", DRAFT: "neutral", ORDERED: "info", PARTIALLY_RECEIVED: "info", RECEIVED: "ready" },
  replenishment: { CANCELLED: "neutral", DONE: "ready", OPEN: "warning" }
} satisfies Record<StatusKind, Record<string, BadgeTone>>;

type StatusByKind = {
  kit: KitOperationalStatus;
  purchaseOrder: PurchaseOrderStatus;
  replenishment: ReplenishmentStatus;
};

export function statusLabel<K extends StatusKind>(kind: K, status: StatusByKind[K]) {
  return (labels[kind] as Record<string, string>)[status] ?? status;
}

export function statusTone<K extends StatusKind>(kind: K, status: StatusByKind[K]) {
  return (tones[kind] as Record<string, BadgeTone>)[status] ?? "neutral";
}

export function StatusBadge<K extends StatusKind>(props: { kind: K; status: StatusByKind[K] }) {
  return <Badge tone={statusTone(props.kind, props.status)}>{statusLabel(props.kind, props.status)}</Badge>;
}
