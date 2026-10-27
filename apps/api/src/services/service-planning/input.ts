import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
export type Input = Record<string, unknown>;
export function object(value: unknown): Input {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new BadRequestException("Ungültiger Datensatz.");
  return value as Input;
}
export function string(
  value: unknown,
  label: string,
  required = false,
  maxLength = 191,
) {
  if (value == null && !required) return "";
  if (
    typeof value !== "string" ||
    value.length > maxLength ||
    (required && !value.trim())
  )
    throw new BadRequestException(`${label} ist ungültig.`);
  return value.trim();
}
export function nullable(value: unknown) {
  return value == null || value === "" ? null : string(value, "Angabe", true);
}
export function bool(value: unknown, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean")
    throw new BadRequestException("Ungültiger Wahrheitswert.");
  return value;
}
export function array(value: unknown): unknown[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 2000)
    throw new BadRequestException("Ungültige Liste.");
  return value;
}
export function integer(value: unknown, fallback = 0) {
  if (value === undefined) return fallback;
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 1000000000
  )
    throw new BadRequestException("Ungültige ganze Zahl.");
  return value;
}
export function optionalInteger(value: unknown) {
  return value == null || value === "" ? null : integer(value);
}
export function choice<T extends string>(
  value: unknown,
  values: readonly T[],
): T {
  if (typeof value !== "string" || !values.includes(value as T))
    throw new BadRequestException("Ungültige Auswahl.");
  return value as T;
}
export function timestamp(value: unknown, label = "Zeitpunkt") {
  const raw = string(value, label, true);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(
      raw,
    ) ||
    !Number.isFinite(Date.parse(raw))
  )
    throw new BadRequestException(
      `${label} benötigt Datum, Uhrzeit und Zeitzone.`,
    );
  const [year, month, day, hour, minute, second = 0] = raw
    .slice(0, 19)
    .split(/[-T:]/)
    .map(Number);
  if (
    !year || year < 1000 ||
    !month ||
    !day ||
    month > 12 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
    hour! > 23 ||
    minute! > 59 ||
    second > 59
  )
    throw new BadRequestException(
      `${label} ist kein gültiger Kalenderzeitpunkt.`,
    );
  const parsed = new Date(raw);
  if (parsed.getUTCFullYear() < 1000 || parsed.getUTCFullYear() > 9999)
    throw new BadRequestException("Das Jahr muss zwischen 1000 und 9999 liegen.");
  return parsed.toISOString();
}
export function optionalTimestamp(value: unknown) {
  return value == null || value === "" ? null : timestamp(value);
}
export function calendarDate(value: unknown) {
  if (value == null || value === "") return null;
  const raw = string(value, "Gültigkeit", true);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(raw) ||
    Number(raw.slice(0, 4)) < 1000 ||
    !Number.isFinite(Date.parse(raw)) ||
    new Date(raw).toISOString().slice(0, 10) !== raw
  )
    throw new BadRequestException("Ungültiges Kalenderdatum.");
  return raw;
}
export function decimal(value: unknown, places = 4) {
  const raw =
    typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : string(value, "Betrag", true);
  if (!new RegExp(`^\\d{1,10}(\\.\\d{1,${places}})?$`).test(raw))
    throw new BadRequestException(
      `Ungültiger Betrag (höchstens ${places} Nachkommastellen).`,
    );
  return raw;
}
export const id = (value: unknown) =>
  value ? string(value, "Kennung", true) : randomUUID();
export function interval(start: string, end: string) {
  if (Date.parse(end) <= Date.parse(start))
    throw new BadRequestException("Zeitraum ist ungültig.");
}
export function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length)
    throw new BadRequestException(`${label} ist mehrfach vorhanden.`);
}
