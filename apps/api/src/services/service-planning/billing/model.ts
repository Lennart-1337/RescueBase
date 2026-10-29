import { BadRequestException } from "@nestjs/common";
import {
  calendarDate,
  choice,
  integer,
  object,
  string,
  type Input,
} from "../input.js";
import type { ServiceRecord } from "../record.js";
import type { BillingPdfModel } from "./pdf.js";
import { amount, billingLines, cents } from "./amounts.js";
export function billingInput(value: Input) {
  const body = object(value);
  const kind = choice(body.kind, ["OFFER", "INVOICE"] as const);
  const number = string(body.number, "Dokumentnummer", true, 64).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9 ._-]*$/.test(number))
    throw new BadRequestException("Dokumentnummer enthält ungültige Zeichen.");
  const issuedOn = calendarDate(body.issuedOn);
  if (!issuedOn) throw new BadRequestException("Dokumentdatum fehlt.");
  const date = new Date(`${issuedOn}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 30);
  if (date.getUTCFullYear() > 9999)
    throw new BadRequestException(
      "Dokumentdatum liegt außerhalb des gültigen Bereichs.",
    );
  const recipient = string(
    body.recipient,
    "Empfängeranschrift",
    true,
    500,
  ).replace(/\r\n?/g, "\n");
  if (recipient.split(/\r?\n/).length > 8)
    throw new BadRequestException(
      "Die Empfängeranschrift darf höchstens 8 Zeilen umfassen.",
    );
  if ([...recipient].some((char) => char.charCodeAt(0) < 32 && char !== "\n" && char !== "\t"))
    throw new BadRequestException(
      "Empfängeranschrift enthält ungültige Zeichen.",
    );
  if (body.version === undefined)
    throw new BadRequestException("Version fehlt.");
  return {
    kind,
    number,
    issuedOn,
    recipient,
    version: integer(body.version),
    validUntil: kind === "OFFER" ? date.toISOString().slice(0, 10) : null,
  };
}
export type BillingInput = ReturnType<typeof billingInput>;
export function billingModel(
  row: ServiceRecord,
  input: BillingInput,
): BillingPdfModel {
  if (row.status === "CANCELLED")
    throw new BadRequestException(
      "Für abgesagte Dienste können keine Abrechnungsdokumente erstellt werden.",
    );
  if (
    input.kind === "INVOICE" &&
    !(row.pricingModel === "LEGACY" ? row.lines.length : row.assignments.length)
  )
    throw new BadRequestException(
      "Für eine Rechnung müssen abrechenbare Leistungen erfasst sein.",
    );
  const lines = billingLines(row, input.kind === "INVOICE");
  return {
    kind: input.kind,
    number: input.number,
    issuedOn: input.issuedOn,
    validUntil: input.validUntil,
    recipient: input.recipient,
    title: row.title,
    lines,
    total: amount(lines.reduce((sum, line) => sum + cents(line.amount), 0n)),
  };
}
