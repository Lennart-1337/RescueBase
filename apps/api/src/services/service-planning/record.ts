import type { Prisma } from "@prisma/client";
export const serviceInclude = {
  positions: true,
  assignments: true,
  reservations: true,
  tasks: true,
  lines: true,
  calculations: { orderBy: { createdAt: "desc" } },
  releases: { orderBy: { createdAt: "desc" } },
  documents: {
    select: {
      id: true,
      serviceId: true,
      filename: true,
      mimeType: true,
      sha256: true,
      size: true,
      createdBy: true,
      createdAt: true,
    },
  },
} as const;
export type ServiceRecord = Prisma.ServiceEventGetPayload<{
  include: typeof serviceInclude;
}>;
export function attendanceMinutes(
  assignment: ServiceRecord["assignments"][number],
  actual = false,
) {
  const start = actual ? assignment.actualStartsAt : assignment.startsAt,
    end = actual ? assignment.actualEndsAt : assignment.endsAt;
  return start && end ? (end.getTime() - start.getTime()) / 60000 : null;
}
export function planningSnapshot(value: ServiceRecord) {
  return {
    startsAt: value.startsAt,
    endsAt: value.endsAt,
    eventStartsAt: value.eventStartsAt,
    eventEndsAt: value.eventEndsAt,
    requirements: value.requirements,
    supportOnly: value.supportOnly,
    positions: value.positions,
    assignments: value.assignments.map(
      ({
        actualStartsAt: _start,
        actualEndsAt: _end,
        hourlyRate: _rate,
        ...row
      }) => row,
    ),
    reservations: value.reservations,
  };
}
