import {
  defaultBillingSettings,
  type BillingSettingsData,
} from "../../../settings/service-billing/defaults.js";
export interface BillingPdfModel {
  kind: "OFFER" | "INVOICE";
  settings?: BillingSettingsData;
  salutation?: string;
  number: string;
  issuedOn: string;
  validUntil: string | null;
  recipient: string;
  title: string;
  lines: Array<{
    description: string;
    timeBasis?: "PLANNED" | "ACTUAL";
    date?: string;
    duration?: string;
    count?: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }>;
  total: string;
}
export const billingLabel = (kind: BillingPdfModel["kind"]) =>
  kind === "OFFER" ? "Angebot" : "Rechnung";
export const displayDate = (value: string) =>
  value.split("-").reverse().join(".");
export function euro(value: string) {
  const [whole, decimals = "00"] = value.split(".");
  return `${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimals.padEnd(2, "0")} €`;
}

export const billingSettings = (model: BillingPdfModel) =>
  model.settings ?? defaultBillingSettings;
