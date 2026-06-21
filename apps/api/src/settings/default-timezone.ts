export function defaultTimezone(
  environmentTimezone = process.env.TZ,
  runtimeTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
): string {
  if (isIanaTimezone(environmentTimezone)) return environmentTimezone;
  if (isIanaTimezone(runtimeTimezone)) return runtimeTimezone;
  return "UTC";
}

function isIanaTimezone(value: string | undefined): value is string {
  if (!value?.trim()) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
