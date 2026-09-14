import { BadRequestException, ConflictException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
export function text(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new BadRequestException(`${label} fehlt.`);
  return value.trim();
}
export function optional(value: unknown): string | null { return value == null || value === "" ? null : text(value, "Angabe"); }
export function date(value: unknown): Date {
  const result = new Date(text(value, "Datum"));
  if (Number.isNaN(result.getTime())) throw new BadRequestException("Ungültiges Datum.");
  return result;
}
export function optionalDate(value: unknown) { return value ? date(value) : null; }
export function isFutureCalendarDate(value: Date, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return value.toISOString().slice(0, 10) > today;
}
export function integer(value: unknown, min = 0): number {
  if (!Number.isInteger(value) || Number(value) < min) throw new BadRequestException("Ungültige ganze Zahl.");
  return Number(value);
}
export function finiteNumber(value: unknown, min = 0): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) throw new BadRequestException("Ungültige Zahl.");
  return number;
}
export function choice(value: unknown, choices: string[]): string {
  if (typeof value !== "string" || !choices.includes(value)) throw new BadRequestException("Ungültige Auswahl.");
  return value;
}
export function revision(actual: number, expected: unknown) {
  if (actual !== integer(expected)) throw new ConflictException("Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.");
}
export function audit(tx: Prisma.TransactionClient, actorId: string, entityType: string, entityId: string, action: string, payload: unknown) {
  return tx.auditEvent.create({ data: { actorType: "USER", actorLabel: actorId, entityType, entityId, action,
    payload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue } });
}
export type Input = Record<string, unknown>;
