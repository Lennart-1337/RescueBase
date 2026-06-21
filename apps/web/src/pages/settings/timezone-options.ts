type TimezoneOption = { label: string; value: string; keywords: string[] };

const fallbackTimezones = [
  "Africa/Cairo",
  "America/Chicago",
  "America/Los_Angeles",
  "America/New_York",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Madrid",
  "UTC"
];

const supportedTimezones = typeof Intl.supportedValuesOf === "function"
  ? Intl.supportedValuesOf("timeZone")
  : fallbackTimezones;

const timezoneValues = Array.from(new Set(["UTC", ...supportedTimezones])).sort((left, right) => left.localeCompare(right));
const timezoneOptions = timezoneValues.map(toOption);

export function getTimezoneOptions(currentTimezone: string): TimezoneOption[] {
  return timezoneValues.includes(currentTimezone) ? timezoneOptions : [toOption(currentTimezone), ...timezoneOptions];
}

function toOption(timezone: string): TimezoneOption {
  const readable = timezone.replaceAll("_", " ");
  return { label: readable, value: timezone, keywords: [timezone, readable] };
}
