import { assertNumber, safeInteger } from "./validation.js";
export interface PersonnelInterval {
  id: string;
  personId: string;
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
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
function timestamp(value: string): number {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:00(?:\.000)?(?:Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!match)
    throw new Error(
      "Time must be an ISO timestamp with timezone and whole minutes.",
    );
  const calendar = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  if (
    !Number.isFinite(calendar.getTime()) ||
    calendar.toISOString().slice(0, 10) !== value.slice(0, 10)
  ) {
    throw new Error("Invalid calendar date.");
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error("Invalid timestamp.");
  return parsed;
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
    const start = timestamp(interval.startsAt);
    const end = timestamp(interval.endsAt);
    if (end <= start) throw new Error("endsAt must be after startsAt.");
    assertNumber(interval.breakMinutes, "breakMinutes", 0, true);
    if (interval.breakMinutes > (end - start) / 60000)
      throw new Error("Break exceeds interval.");
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
      (interval.end - interval.start) / 60000 - interval.breakMinutes,
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
