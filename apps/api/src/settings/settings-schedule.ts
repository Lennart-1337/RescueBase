export function isScheduleDue(now: Date, lastRunAt: Date | null, configuredTime: string, timezone: string): boolean {
  const current = localParts(now, timezone);
  const [hours = 0, minutes = 0] = configuredTime.split(":").map(Number);
  if (current.hours * 60 + current.minutes < hours * 60 + minutes) return false;
  if (!lastRunAt) return true;
  const previous = localParts(lastRunAt, timezone);
  return `${previous.year}-${previous.month}-${previous.day}` !== `${current.year}-${current.month}-${current.day}`;
}

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hours: value("hour"), minutes: value("minute") };
}
