import { BadRequestException } from "@nestjs/common";

export function validateTimezone(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new BadRequestException("Zeitzone ist erforderlich.");
  try {
    new Intl.DateTimeFormat("de-DE", { timeZone: value.trim() }).format();
  } catch {
    throw new BadRequestException("Zeitzone muss eine gültige IANA-Zeitzone sein.");
  }
  return value.trim();
}

export function validateTime(value: unknown): string {
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new BadRequestException("Uhrzeit muss im Format HH:MM angegeben werden.");
  }
  return value;
}

export function validateBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new BadRequestException(`${field} muss ein boolescher Wert sein.`);
  return value;
}

export function validateDisplayText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new BadRequestException(`${field} ist erforderlich.`);
  const normalized = value.trim();
  if (normalized.length > 80) throw new BadRequestException(`${field} darf maximal 80 Zeichen lang sein.`);
  return normalized;
}

export function validateWarningWindow(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 3650) {
    throw new BadRequestException("Warnzeitraum muss eine ganze Zahl zwischen 1 und 3650 Tagen sein.");
  }
  return Number(value);
}

export function validateIntegerRange(value: unknown, field: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new BadRequestException(`${field} muss eine ganze Zahl zwischen ${minimum} und ${maximum} sein.`);
  }
  return Number(value);
}
