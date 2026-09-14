/** Strict ISO calendar date, deliberately independent of local daylight saving time. */
export function calendarDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Expected ISO calendar date.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Invalid calendar date.');
  return value;
}

export function addCalendarMonths(value: string, months: number): string {
  calendarDate(value);
  if (!Number.isSafeInteger(months) || months < 0) throw new Error('Months must be a non-negative integer.');
  const date = new Date(`${value}T00:00:00.000Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const end = new Date(date);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  date.setUTCDate(Math.min(day, end.getUTCDate()));
  return calendarDate(date.toISOString().slice(0, 10));
}
