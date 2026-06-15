import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { rescueBaseApi } from "../lib/api";
import type { Batch, KitOperationalStatus } from "../lib/types";
import { Button, Panel } from "../components/ui";

export const statusLabels: Record<KitOperationalStatus, string> = {
  READY: "Bereit",
  CONDITIONAL: "Bedingt einsatzbereit",
  NOT_READY: "Nicht einsatzbereit"
};

export function Metric({
  icon,
  label,
  tone,
  value
}: {
  icon: ReactNode;
  label: string;
  tone: "ready" | "warning" | "danger" | "info";
  value: string;
}) {
  return (
    <Panel className="metric">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </Panel>
  );
}

export function LoadingPanel({ label }: { label: string }) {
  return (
    <Panel className="state-panel">
      <h1>{label}</h1>
    </Panel>
  );
}

export function ErrorPanel({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Panel className="state-panel error-state">
      <AlertTriangle />
      <h1>API nicht verfügbar</h1>
      <p>{error.message}</p>
      <Button onClick={onRetry} type="button">
        Erneut versuchen
      </Button>
    </Panel>
  );
}

export function InlineError({ error }: { error: Error }) {
  return (
    <div className="inline-error" role="alert">
      <AlertTriangle />
      <span>{error.message}</span>
    </div>
  );
}

export function EmptyState({ text, title }: { text: string; title: string }) {
  return (
    <div className="empty-state">
      <ClipboardList />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

export function useDashboardData() {
  const kits = useQuery({ queryKey: ["kits"], queryFn: rescueBaseApi.kits });
  const batches = useQuery({ queryKey: ["batches"], queryFn: rescueBaseApi.batches });
  const orders = useQuery({ queryKey: ["orders"], queryFn: rescueBaseApi.orders });

  return {
    data: kits.data && batches.data && orders.data ? { kits: kits.data, batches: batches.data, orders: orders.data } : undefined,
    error: kits.error ?? batches.error ?? orders.error,
    isError: kits.isError || batches.isError || orders.isError,
    isLoading: kits.isLoading || batches.isLoading || orders.isLoading,
    refetch: async () => {
      await Promise.all([kits.refetch(), batches.refetch(), orders.refetch()]);
    }
  };
}

export function selectedBatchQuantity(batches: Batch[], batchId: string): number {
  return batches.find((batch) => batch.id === batchId)?.quantity ?? 0;
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Unbekannter Fehler.");
}

export function formatStatus(status: string): string {
  return {
    OPEN: "Offen",
    IN_PROGRESS: "In Arbeit",
    DONE: "Erledigt",
    CANCELLED: "Storniert"
  }[status] ?? status;
}

export function formatReason(reason: string): string {
  return {
    SHORTAGE: "Fehlmenge",
    DISCARDED_EXPIRED: "Abgelaufen verworfen",
    SHORTAGE_AND_DISCARDED_EXPIRED: "Fehlmenge und Verwurf"
  }[reason] ?? reason;
}

export function formatMovementType(type: string): string {
  return {
    BATCH_CREATED: "Ersterfassung",
    BATCH_CORRECTION: "Korrektur",
    REPLENISHMENT_FULFILLMENT: "Nachfüllung"
  }[type] ?? type;
}

export function locationKindLabel(kind: string): string {
  return {
    STORAGE: "Lager",
    VEHICLE: "Fahrzeug",
    ROOM: "Raum"
  }[kind] ?? kind;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin"
  }).format(new Date(value));
}

export function daysUntil(value: string): number {
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export async function copyText(value: string, key: string, setCopiedValue: (value: string) => void) {
  try {
    await navigator.clipboard.writeText(value);
    setCopiedValue(key);
    window.setTimeout(() => setCopiedValue(""), 1500);
  } catch {
    setCopiedValue("");
  }
}
