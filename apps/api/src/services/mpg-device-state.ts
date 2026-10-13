import { calculateMpgDueDate, evaluateMpgDevice } from "@rescuebase/domain";
import type { Prisma } from "@prisma/client";

export const deviceInclude = { mpgModel: { include: { requirements: true, glucoseRanges: true } }, requirements: true, location: true, kit: true,
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
    const interval = requirement.kind === "STK" ? Math.min(requirement.intervalMonths ?? 24, 24) : requirement.intervalMonths;
    let computed: string | null = null;
    let intervalIsValid = true;
    if (interval && base) {
      try { computed = calculateMpgDueDate(requirement.kind, day(base), interval); }
      catch { intervalIsValid = false; } // Invalid historical rules remain blocked until corrected.
    }
    const initial = !latest && requirement.firstDueAt ? day(requirement.firstDueAt) : null;
    const documentedDue = latest?.nextDueAt ? day(latest.nextDueAt) : null;
    const dueDate = !intervalIsValid ? null : documentedDue ? (computed && computed < documentedDue ? computed : documentedDue) : computed && initial
      ? (computed < initial ? computed : initial) : computed ?? initial;
    return { ...requirement, dueDate };
  });
  const modelReviewedAt = device.mpgModel?.requirementsReviewedAt;
  const latestDeviceRule = device.requirements.filter((requirement) => requirement.active).reduce<Date | null>((latest, requirement) =>
    !latest || requirement.createdAt > latest ? requirement.createdAt : latest, null);
  const currentRelease = device.releasedAt && modelReviewedAt && device.releasedAt >= modelReviewedAt &&
    (!latestDeviceRule || device.releasedAt >= latestDeviceRule) ? device.releasedAt.toISOString() : null;
  return { ...device, requirements, ...evaluateMpgDevice({ requirementsReviewed: Boolean(modelReviewedAt),
    releasedAt: currentRelease, retiredAt: device.retiredAt?.toISOString(), requirements,
    inspections: inspections.map((row) => ({ ...row, result: row.result as "PASSED" | "FAILED", performedAt: row.performedAt.toISOString(), finalizedAt: row.finalizedAt?.toISOString() })),
    incidents: device.incidents.map((row) => ({ ...row, resolvedAt: row.resolvedAt?.toISOString() })),
    glucoseControls: device.glucoseControls.map((row) => ({ ...row, performedAt: row.performedAt.toISOString(), resolution: row.resolvedAt ? row.clarification : null })),
  }, day(now)) };
}
