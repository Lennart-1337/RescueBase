const parts = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export function berlinInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? parts.format(date).replace(" ", "T")
    : "";
}
export type BerlinOccurrence = "EARLIER" | "LATER";
export function berlinChoices(
  value: string,
): { value: BerlinOccurrence; label: string; iso: string }[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return [];
  const wallTime = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wallTime)) return [];
  return [
    { offset: 120, value: "EARLIER" as const, label: "Sommerzeit (UTC+02:00)" },
    { offset: 60, value: "LATER" as const, label: "Winterzeit (UTC+01:00)" },
  ]
    .map((option) => ({
      ...option,
      iso: new Date(wallTime - option.offset * 60_000).toISOString(),
    }))
    .filter((option) => berlinInput(option.iso) === value);
}
export function berlinIso(
  value: string,
  occurrence?: BerlinOccurrence,
): string {
  const candidates = berlinChoices(value);
  if (!candidates.length)
    throw new Error(
      "Diese Uhrzeit existiert in Europe/Berlin nicht oder ist ungültig (Zeitumstellung).",
    );
  if (candidates.length === 1) return candidates[0]!.iso;
  const match = candidates.find((candidate) => candidate.value === occurrence);
  if (!match)
    throw new Error(
      "Diese Uhrzeit kommt zweimal vor. Bitte Sommerzeit oder Winterzeit auswählen.",
    );
  return match.iso;
}
export const displayTime = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Nicht erfasst";
export function formatMinutes(value: number | null | undefined): string {
  return value == null
    ? "Nicht erfasst"
    : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")} h`;
}
const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
// Intl accepts exact decimal strings; the assertion avoids TypeScript's older
// number-only overload without coercing amounts through binary floating point.
export const money = (value: string | number | null | undefined) =>
  value == null ? "Nicht erfasst" : currency.format(value as number);

const unitRate = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
export const rateMoney = (value: string) =>
  unitRate.format(value as unknown as number);
