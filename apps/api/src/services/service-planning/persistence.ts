import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { json } from "./catalog.service.js";
import type { ServiceWrite } from "./types.js";
export const scalarData = ({
  positions: _p,
  assignments: _a,
  reservations: _r,
  tasks: _t,
  lines: _l,
  version: _v,
  outcome,
  ...data
}: ServiceWrite) => ({
  ...data,
  eventStartsAt: new Date(data.eventStartsAt),
  eventEndsAt: new Date(data.eventEndsAt),
  startsAt: new Date(data.startsAt),
  endsAt: new Date(data.endsAt),
  outcome: json(outcome),
});
export async function validateReferences(
  tx: Prisma.TransactionClient,
  data: ServiceWrite,
) {
  const personIds = data.assignments.map((a) => a.personId),
    userIds = [
      ...new Set(
        [data.responsibleId, ...data.tasks.map((t) => t.responsibleId)].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ];
  if (
    (await tx.person.count({ where: { id: { in: personIds } } })) !==
    personIds.length
  )
    throw new BadRequestException("Eine Person existiert nicht mehr.");
  if (
    (await tx.user.count({
      where: { id: { in: userIds }, active: true, deletedAt: null },
    })) !== userIds.length
  )
    throw new BadRequestException("Ein Verantwortlicher ist nicht verfügbar.");
  for (const r of data.reservations) {
    const found = await (r.kind === "VEHICLE"
      ? tx.serviceVehicle.findUnique({ where: { id: r.resourceId } })
      : r.kind === "KIT"
        ? tx.kit.findUnique({ where: { id: r.resourceId } })
        : tx.mpgDevice.findUnique({ where: { id: r.resourceId } }));
    if (!found)
      throw new BadRequestException(
        "Eine reservierte Ressource existiert nicht mehr.",
      );
  }
}
export async function replaceChildren(
  tx: Prisma.TransactionClient,
  serviceId: string,
  data: ServiceWrite,
) {
  await tx.serviceAssignment.deleteMany({ where: { serviceId } });
  await tx.servicePosition.deleteMany({ where: { serviceId } });
  await tx.serviceReservation.deleteMany({ where: { serviceId } });
  await tx.serviceTask.deleteMany({ where: { serviceId } });
  await tx.serviceCostLine.deleteMany({ where: { serviceId } });
  if (data.positions.length)
    await tx.servicePosition.createMany({
      data: data.positions.map((p) => ({ ...p, serviceId })),
    });
  if (data.assignments.length)
    await tx.serviceAssignment.createMany({
      data: data.assignments.map((a) => ({
        ...a,
        serviceId,
        startsAt: new Date(a.startsAt),
        endsAt: new Date(a.endsAt),
        actualStartsAt: a.actualStartsAt ? new Date(a.actualStartsAt) : null,
        actualEndsAt: a.actualEndsAt ? new Date(a.actualEndsAt) : null,
      })),
    });
  if (data.reservations.length)
    await tx.serviceReservation.createMany({
      data: data.reservations.map((r) => ({
        ...r,
        serviceId,
        startsAt: new Date(r.startsAt),
        endsAt: new Date(r.endsAt),
      })),
    });
  if (data.tasks.length)
    await tx.serviceTask.createMany({
      data: data.tasks.map((t) => ({
        ...t,
        serviceId,
        dueAt: t.dueAt ? new Date(t.dueAt) : null,
      })),
    });
  if (data.lines.length)
    await tx.serviceCostLine.createMany({
      data: data.lines.map((l) => ({ ...l, serviceId })),
    });
}
export function rethrowConflict(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ["P2025", "P2002", "P2034"].includes(error.code)
  )
    throw new ConflictException(
      "Datensatz wurde zwischenzeitlich geändert oder ist bereits vorhanden. Bitte neu laden.",
    );
  throw error;
}
