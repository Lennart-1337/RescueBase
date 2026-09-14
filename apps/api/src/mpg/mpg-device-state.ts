import { addCalendarMonths, evaluateMpgDevice } from "@rescuebase/domain";
import type { Prisma } from "@prisma/client";
export const deviceInclude = { mpgModel: { include: { requirements: true } }, location: true, kit: true,
  inspections: { include: { requirement: true } }, glucoseControls: true, incidents: true, assignments: true } as const;
export type DeviceRecord = Prisma.MedicalDeviceGetPayload<{ include: typeof deviceInclude }>;
const day = (value: Date) => value.toISOString().slice(0, 10);
export function deviceState(device: DeviceRecord, now = new Date()) {
  const corrected = new Set(device.inspections.filter(i => i.finalizedAt).map(i => i.correctionOfId));
  const inspections = device.inspections.filter(i => !corrected.has(i.id));
  const requirements = (device.mpgModel?.requirements ?? []).filter(r => r.active).map(r => {
    const latest = inspections.filter(i => i.requirementId === r.id && i.finalizedAt)
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())[0];
    const base = latest?.performedAt ?? device.commissionedAt;
    const dueDate = latest?.nextDueAt ? day(latest.nextDueAt) : r.intervalMonths && base
      ? addCalendarMonths(day(base), r.intervalMonths) : r.firstDueAt ? day(r.firstDueAt) : null;
    return { ...r, dueDate };
  });
  return { ...device, requirements, ...evaluateMpgDevice({ requirementsReviewed: Boolean(device.mpgModel?.requirementsReviewedAt),
    releasedAt: device.releasedAt?.toISOString(), retiredAt: device.retiredAt?.toISOString(), requirements,
    inspections: inspections.map(i => ({ ...i, result: i.result as "PASSED" | "FAILED", performedAt: i.performedAt.toISOString(), finalizedAt: i.finalizedAt?.toISOString() })),
    incidents: device.incidents.map(i => ({ ...i, resolvedAt: i.resolvedAt?.toISOString() })),
    glucoseControls: device.glucoseControls.map(g => ({ ...g, performedAt: g.performedAt.toISOString(), resolution: g.resolvedAt ? g.clarification : null }))
  }, day(now)) };
}
