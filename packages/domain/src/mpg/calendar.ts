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

/** Calculates a due date only after a model-specific interval has been documented. */
export function calculateMpgDueDate(kind: string, performedOn: string, intervalMonths: number): string {
  if (!Number.isSafeInteger(intervalMonths) || intervalMonths < 1) throw new Error('A documented positive interval is required.');
  if (kind === 'STK' && intervalMonths > 24) throw new Error('STK interval exceeds the statutory two-year limit.');
  if (kind === 'MTK' && intervalMonths % 12 !== 0) throw new Error('MTK interval must use documented whole years.');
  const anniversary = addCalendarMonths(performedOn, intervalMonths);
  if (kind !== 'STK' && kind !== 'MTK') return anniversary;
  if (kind === 'MTK') return `${anniversary.slice(0, 4)}-12-31`;
  const monthStart = new Date(`${anniversary.slice(0, 7)}-01T00:00:00.000Z`);
  monthStart.setUTCMonth(monthStart.getUTCMonth() + 1, 0);
  return calendarDate(monthStart.toISOString().slice(0, 10));
}
