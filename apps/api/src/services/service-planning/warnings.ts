import type { Prisma } from "@prisma/client";
import { deviceInclude, deviceState } from "../mpg-device-state.js";
import { type ServiceRecord } from "./record.js";
import type { ServiceWarning } from "./types.js";
export type WarningContext = {
  people: {
    id: string;
    active: boolean;
    leader: boolean;
    qualifications: {
      qualification: string;
      validUntil: Date | null;
      recognizedQualifications: Prisma.JsonValue;
    }[];
  }[];
  vehicles: { id: string; active: boolean; ready: boolean }[];
  kits: { id: string; status: string; deletedAt?: Date | null }[];
  devices: { id: string; kitId: string | null; status: string }[];
  peers: Pick<
    ServiceRecord,
    "id" | "status" | "assignments" | "reservations"
  >[];
};
export const binding = (status: string) =>
  !["INQUIRY", "CANCELLED"].includes(status);
const overlaps = (
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date },
) => a.startsAt < b.endsAt && b.startsAt < a.endsAt;
export async function serviceWarnings(
  tx: Prisma.TransactionClient,
  service: ServiceRecord,
) {
  return (await serviceWarningsBatch(tx, [service])).get(service.id) ?? [];
}
export async function serviceWarningsBatch(
  tx: Prisma.TransactionClient,
  services: ServiceRecord[],
) {
  if (!services.length) return new Map<string, ServiceWarning[]>();
  const [people, vehicles, kits, devices, peers] = await Promise.all([
    tx.person.findMany({
      where: {
        id: {
          in: services.flatMap((service) =>
            service.assignments.map((a) => a.personId),
          ),
        },
      },
      include: { qualifications: true },
    }),
    tx.serviceVehicle.findMany(),
    tx.kit.findMany(),
    tx.mpgDevice.findMany({ include: deviceInclude }),
    tx.serviceEvent.findMany({
      where: { status: { notIn: ["INQUIRY", "CANCELLED"] } },
      select: { id: true, status: true, assignments: true, reservations: true },
    }),
  ]);
  return new Map(
    services.map((service) => [
      service.id,
      evaluateWarnings(service, {
        people,
        vehicles,
        kits,
        devices: devices.map((device) => ({
          id: device.id,
          kitId: device.kitId,
          status: deviceState(device, service.startsAt).status,
        })),
        peers: peers.filter((peer) => peer.id !== service.id),
      }),
    ]),
  );
}
export function evaluateWarnings(
  service: ServiceRecord,
  context: WarningContext,
): ServiceWarning[] {
  const warnings: ServiceWarning[] = [];
  const add = (code: string, message: string, entityId: string | null = null) =>
    warnings.push({ code, message, entityId });
  const date = (value: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(value);
  for (const a of service.assignments) {
    const person = context.people.find((p) => p.id === a.personId),
      position = service.positions.find((p) => p.id === a.positionId);
    if (!person?.active)
      add("PERSON_INACTIVE", "Eine eingeplante Person ist nicht aktiv.", a.id);
    const qualified = person?.qualifications.some(
      (q) =>
        (q.qualification === position?.qualification ||
          (Array.isArray(q.recognizedQualifications) &&
            q.recognizedQualifications.includes(
              position?.qualification ?? "",
            ))) &&
        (!q.validUntil ||
          q.validUntil.toISOString().slice(0, 10) >=
            date(new Date(a.endsAt.getTime() - 1))),
    );
    if (!qualified || a.qualification !== position?.qualification)
      add(
        "QUALIFICATION",
        "Die erforderliche Qualifikation ist nicht gültig nachgewiesen.",
        a.id,
      );
    if (position?.leader && !person?.leader)
      add("LEADERSHIP", "Die Führungsfunktion ist nicht nachgewiesen.", a.id);
    if (
      binding(service.status) &&
      context.peers.some(
        (peer) =>
          binding(peer.status) &&
          peer.assignments.some(
            (other) => other.personId === a.personId && overlaps(a, other),
          ),
      )
    )
      add(
        "PERSON_CONFLICT",
        "Die Person ist zeitgleich in einem anderen Dienst eingeplant.",
        a.id,
      );
  }
  for (const p of service.positions) {
    const assigned = service.assignments.filter((a) => a.positionId === p.id);
    const points = [
      service.startsAt,
      ...assigned.flatMap((a) => [a.startsAt, a.endsAt]),
    ].filter((t) => t >= service.startsAt && t < service.endsAt);
    if (
      points.some(
        (t) =>
          assigned.filter((a) => a.startsAt <= t && a.endsAt > t).length <
          p.quantity,
      )
    )
      add(
        "UNDERSTAFFED",
        `Position „${p.name}“ ist nicht durchgehend ausreichend besetzt.`,
        p.id,
      );
    if (assigned.some((a) => a.breakMinutes > 0))
      add(
        "BREAK_COVERAGE",
        `Pausenablösung für „${p.name}“ muss fachlich abgestimmt werden.`,
        p.id,
      );
  }
  if (
    service.status === "REVIEW" &&
    ["visitors", "treatments", "transports", "emergencyPhysicians"].some(
      (key) =>
        (service.outcome as Record<string, unknown> | undefined)?.[key] == null,
    )
  )
    add(
      "OUTCOME_INCOMPLETE",
      "Medizinische Abschlusszahlen sind noch nicht vollständig erfasst.",
    );
  if (!service.positions.length)
    add("NO_POSITIONS", "Der eigene Kräfteansatz ist noch nicht erfasst.");
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
