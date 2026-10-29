import type { ServiceRecord } from "./record.js";
import { overlaps } from "./warning-utils.js";
type Assignment = ServiceRecord["assignments"][number];
export function attendanceOverlaps(a: Assignment, b: Assignment): boolean {
  if (overlaps(a, b)) return true;
  return Boolean(a.actualStartsAt && a.actualEndsAt && b.actualStartsAt && b.actualEndsAt &&
    overlaps({ startsAt: a.actualStartsAt, endsAt: a.actualEndsAt },
      { startsAt: b.actualStartsAt, endsAt: b.actualEndsAt }));
}
