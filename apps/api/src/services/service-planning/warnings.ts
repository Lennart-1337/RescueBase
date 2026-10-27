import { deviceInclude, deviceState } from "../mpg-device-state.js";
import type { Prisma } from "@prisma/client";
import type { ServiceRecord } from "./record.js";
import type { ServiceWarning } from "./types.js";
import type { WarningContext } from "./warning-context.js";
import { personnelWarnings } from "./personnel-warnings.js";
import { resourceWarnings } from "./resource-warnings.js";
export type { WarningContext } from "./warning-context.js";
export { binding } from "./warning-utils.js";
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
export function evaluateWarnings(service: ServiceRecord, context: WarningContext): ServiceWarning[] {
  return [...personnelWarnings(service, context), ...resourceWarnings(service, context)];
}
