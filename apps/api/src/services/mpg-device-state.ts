import { addCalendarMonths, evaluateMpgDevice } from "@rescuebase/domain";
import type { Prisma } from "@prisma/client";

export const deviceInclude = { mpgModel: { include: { requirements: true } }, requirements: true, location: true, kit: true,
  inspections: { include: { requirement: true } }, glucoseControls: true, incidents: true, assignments: true } as const;
export type DeviceRecord = Prisma.MpgDeviceGetPayload<{ include: typeof deviceInclude }>;
const day = (value: Date) => value.toISOString().slice(0, 10);

export function deviceState(device: DeviceRecord, now = new Date()) {
  const corrected = new Set(device.inspections.filter((row) => row.finalizedAt).map((row) => row.correctionOfId));
  const inspections = device.inspections.filter((row) => !corrected.has(row.id));
  const requirements = [...(device.mpgModel?.requirements ?? []), ...device.requirements].filter((row) => row.active).map((requirement) => {
    const latest = inspections.filter((row) => row.requirementId === requirement.id && row.finalizedAt)
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())[0];
    const base = latest?.performedAt ?? device.commissionedAt;
    const dueDate = latest ? (latest.nextDueAt ? day(latest.nextDueAt) : requirement.intervalMonths
      ? addCalendarMonths(day(latest.performedAt), requirement.intervalMonths) : null) : requirement.intervalMonths && base
      ? addCalendarMonths(day(base), requirement.intervalMonths) : requirement.firstDueAt ? day(requirement.firstDueAt) : null;
    return { ...requirement, dueDate };
  });
  return { ...device, requirements, ...evaluateMpgDevice({ requirementsReviewed: Boolean(device.mpgModel?.requirementsReviewedAt),
    releasedAt: device.releasedAt?.toISOString(), retiredAt: device.retiredAt?.toISOString(), requirements,
    inspections: inspections.map((row) => ({ ...row, result: row.result as "PASSED" | "FAILED", performedAt: row.performedAt.toISOString(), finalizedAt: row.finalizedAt?.toISOString() })),
    incidents: device.incidents.map((row) => ({ ...row, resolvedAt: row.resolvedAt?.toISOString() })),
    glucoseControls: device.glucoseControls.map((row) => ({ ...row, performedAt: row.performedAt.toISOString(), resolution: row.resolvedAt ? row.clarification : null })),
  }, day(now)) };
}
