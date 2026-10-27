import type { ServiceRecord } from "./record.js";
import type { ServiceWarning } from "./types.js";
import type { WarningContext } from "./warning-context.js";
import { binding, overlaps } from "./warning-utils.js";
export function resourceWarnings(service: ServiceRecord, context: WarningContext): ServiceWarning[] {
  const warnings: ServiceWarning[] = [];
  const add = (code: string, message: string, entityId: string | null = null) => warnings.push({ code, message, entityId });
  const keys = (r: ServiceRecord["reservations"][number]) =>
    r.kind === "KIT"
      ? [
          `KIT:${r.resourceId}`,
          ...context.devices
            .filter((d) => d.kitId === r.resourceId)
            .map((d) => `DEVICE:${d.id}`),
        ]
      : [`${r.kind}:${r.resourceId}`];
  for (const r of service.reservations) {
    const ready =
      r.kind === "KIT"
        ? context.kits.some(
            (k) =>
              k.id === r.resourceId && k.status === "READY" && !k.deletedAt,
          )
        : r.kind === "VEHICLE"
          ? context.vehicles.some(
              (v) => v.id === r.resourceId && v.ready && v.active,
            )
          : context.devices.some(
              (d) => d.id === r.resourceId && d.status === "RELEASED",
            );
    const containedReady =
      r.kind !== "KIT" ||
      context.devices
        .filter((d) => d.kitId === r.resourceId)
        .every((d) => d.status === "RELEASED");
    if (!ready || !containedReady)
      add(
        "RESOURCE_NOT_READY",
        "Eine Ressource oder ein enthaltenes Gerät ist nicht einsatzbereit.",
        r.id,
      );
    const ownKeys = keys(r);
    if (
      binding(service.status) &&
      context.peers.some(
        (peer) =>
          binding(peer.status) &&
          peer.reservations.some(
            (other) =>
              overlaps(r, other) &&
              keys(other).some((key) => ownKeys.includes(key)),
          ),
      )
    )
      add(
        "RESOURCE_CONFLICT",
        "Ressource oder enthaltenes Gerät ist zeitgleich in einem anderen Dienst reserviert.",
        r.id,
      );
    if (
      service.reservations.some(
        (other) =>
          other.id !== r.id &&
          overlaps(r, other) &&
          keys(other).some((key) => ownKeys.includes(key)),
      )
    )
      add(
        "DUPLICATE_RESOURCE",
        "Diese Ausstattung ist innerhalb des Dienstes mehrfach reserviert.",
        r.id,
      );
  }
  return warnings;
}
