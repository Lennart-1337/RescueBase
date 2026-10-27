import { safeInteger } from "./validation.js";
import { attendanceTimestamp } from "./attendance-time.js";
export interface PersonnelInterval {
  id: string;
  personId: string;
  startsAt: string;
  endsAt: string;
}
export interface PersonnelConflict {
  personId: string;
  firstIntervalId: string;
  secondIntervalId: string;
}
export interface PersonnelTimeSummary {
  totalMinutes: number;
  byPerson: Record<string, number>;
}
interface ParsedInterval extends PersonnelInterval {
  start: number;
  end: number;
}
function parse(input: PersonnelInterval[]): ParsedInterval[] {
  const ids = new Set<string>();
  return input.map((interval) => {
    if (
      !interval.id?.trim() ||
      !interval.personId?.trim() ||
      ids.has(interval.id)
    ) {
      throw new Error("Personnel intervals need unique IDs and a person ID.");
    }
    ids.add(interval.id);
    const start = attendanceTimestamp(interval.startsAt);
    const end = attendanceTimestamp(interval.endsAt);
    if (end <= start) throw new Error("endsAt must be after startsAt.");
    return { ...interval, start, end };
  });
}
function conflicts(input: ParsedInterval[]): PersonnelConflict[] {
  const result: PersonnelConflict[] = [];
  for (let index = 0; index < input.length; index++) {
    const first = input[index]!;
    for (const second of input.slice(index + 1)) {
      if (
        first.personId === second.personId &&
        first.start < second.end &&
        second.start < first.end
      ) {
        result.push({
          personId: first.personId,
          firstIntervalId: first.id,
          secondIntervalId: second.id,
        });
      }
    }
  }
  return result;
}
export function findPersonnelConflicts(
  input: PersonnelInterval[],
): PersonnelConflict[] {
  return conflicts(parse(input));
}
export function calculatePersonnelMinutes(
  input: PersonnelInterval[],
): PersonnelTimeSummary {
  const intervals = parse(input);
  if (conflicts(intervals).length)
    throw new Error("Overlapping personnel intervals cannot be totalled.");
  const totals = new Map<string, bigint>();
  for (const interval of intervals) {
    const minutes = BigInt(
      (interval.end - interval.start) / 60000,
    );
    totals.set(
      interval.personId,
      (totals.get(interval.personId) ?? 0n) + minutes,
    );
  }
  return {
    totalMinutes: safeInteger(
      [...totals.values()].reduce((sum, value) => sum + value, 0n),
    ),
    byPerson: Object.fromEntries(
      [...totals.entries()].map(([key, value]) => [key, safeInteger(value)]),
    ),
  };
}
