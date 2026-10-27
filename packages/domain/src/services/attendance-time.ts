export function attendanceTimestamp(value: string): number {
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
