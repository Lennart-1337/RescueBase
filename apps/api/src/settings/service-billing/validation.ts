import { BadRequestException } from "@nestjs/common";
import { isEmail, isIBAN, isURL } from "class-validator";
import { object } from "../../services/service-planning/input.js";
import type { BillingSettingsData } from "./defaults.js";
import { billingTextFields } from "./fields.js";
const invalid = (label: string): never => {
  throw new BadRequestException(`${label} ist ungültig.`);
};
export function normalizeBillingSettings(value: unknown): BillingSettingsData {
  const input = object(value),
    result: Record<string, string | number | boolean> = {};
  const known = new Set([
    ...Object.keys(billingTextFields),
    "offerValidityDays",
    "paymentTermDays",
    "showLogo",
  ]);
  if (Object.keys(input).some((key) => !known.has(key))) invalid("Einstellung");
  for (const [key, field] of Object.entries(billingTextFields)) {
    const raw = input[key];
    if (typeof raw !== "string" || raw.length > field.max) invalid(field.label);
    const text = (raw as string).replace(/\r\n?/g, "\n").trim();
    if (
      (field.required && !text) ||
      text.split("\n").length > field.lines ||
      [...text].some((char) => char.charCodeAt(0) < 32 && char !== "\n")
    )
      invalid(field.label);
    result[key] = text;
  }
  const iban = String(result.iban).replace(/ /g, "").toUpperCase();
  const bic = String(result.bic).toUpperCase();
  if (iban.length > 34 || !isIBAN(iban)) invalid("IBAN");
  if (bic && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) invalid("BIC");
  if (result.email && !isEmail(String(result.email))) invalid("E-Mail");
  if (
    result.website &&
    !isURL(String(result.website), {
      protocols: ["http", "https"],
      require_protocol: true,
      require_valid_protocol: true,
      disallow_auth: true,
    })
  )
    invalid("Website");
  result.iban = iban;
  result.bic = bic;
  for (const key of ["offerValidityDays", "paymentTermDays"] as const) {
    if (
      !Number.isSafeInteger(input[key]) ||
      Number(input[key]) < 1 ||
      Number(input[key]) > 365
    )
      invalid(
        key === "offerValidityDays" ? "Angebotsgültigkeit" : "Zahlungsfrist",
      );
    result[key] = Number(input[key]);
  }
  if (typeof input.showLogo !== "boolean") invalid("Logo anzeigen");
  result.showLogo = input.showLogo as boolean;
  return result as unknown as BillingSettingsData;
}
