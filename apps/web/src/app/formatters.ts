import type { KitOperationalStatus } from "../lib/types";

export const statusLabels: Record<KitOperationalStatus, string> = {
  READY: "Bereit",
  CONDITIONAL: "Bedingt einsatzbereit",
  NOT_READY: "Nicht einsatzbereit"
};

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Unbekannter Fehler.");
}

export function formatStatus(status: string): string {
  return { OPEN: "Offen", IN_PROGRESS: "In Arbeit", DONE: "Erledigt", CANCELLED: "Storniert" }[status] ?? status;
}

export function formatReason(reason: string): string {
  return {
    SHORTAGE: "Fehlmenge",
    DISCARDED_EXPIRED: "Abgelaufen verworfen",
    SHORTAGE_AND_DISCARDED_EXPIRED: "Fehlmenge und Verwurf"
  }[reason] ?? reason;
}

export function formatMovementType(type: string): string {
  return { BATCH_CREATED: "Ersterfassung", BATCH_CORRECTION: "Korrektur", REPLENISHMENT_FULFILLMENT: "Nachfüllung" }[type] ?? type;
}

export function locationKindLabel(kind: string): string {
  return { STORAGE: "Lager", VEHICLE: "Fahrzeug", ROOM: "Raum" }[kind] ?? kind;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(value));
}

export function daysUntil(value: string): number {
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}
