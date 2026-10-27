import type { CostSummary } from "./costs.js";
import { attendanceTimestamp } from "./attendance-time.js";
import { decimal, money } from "./money.js";

export interface AttendancePricingInput {
  startsAt: string;
  endsAt: string;
  actualStartsAt: string | null;
  actualEndsAt: string | null;
  hourlyRate: string;
}

function attendanceCents(startsAt: string, endsAt: string, hourlyRate: string): bigint {
  const elapsed = attendanceTimestamp(endsAt) - attendanceTimestamp(startsAt);
  if (elapsed <= 0) throw new Error("endsAt must be after startsAt.");
  // Milliseconds × rate scaled by 10^4 / (milliseconds per hour × 100).
  const divisor = 360000000n;
  return (BigInt(elapsed) * decimal(hourlyRate) + divisor / 2n) / divisor;
}

export function calculateAttendanceAmount(startsAt: string, endsAt: string, hourlyRate: string): string {
  return money(attendanceCents(startsAt, endsAt, hourlyRate));
}

/** Round each person's full elapsed attendance once, then add the flat rate once. */
export function calculateAttendancePricing(
  assignments: AttendancePricingInput[],
  materialDiscounted: boolean,
): CostSummary {
  const material = materialDiscounted ? 0n : 3500n;
  let planned = material, actual = material;
  let complete = assignments.length > 0;
  for (const assignment of assignments) {
    planned += attendanceCents(assignment.startsAt, assignment.endsAt, assignment.hourlyRate);
    const { actualStartsAt: start, actualEndsAt: end } = assignment;
    if (Boolean(start) !== Boolean(end)) throw new Error("Actual attendance must be complete.");
    if (start && end) actual += attendanceCents(start, end, assignment.hourlyRate);
    else complete = false;
  }
  return {
    currency: "EUR",
    agreedRevenue: null,
    planned: { cost: "0.00", revenue: money(planned), result: money(planned) },
    actual: {
      complete,
      cost: complete ? "0.00" : null,
      revenue: complete ? money(actual) : null,
      knownCost: "0.00",
      knownRevenue: money(actual),
      result: complete ? money(actual) : null,
    },
  };
}
