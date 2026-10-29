import type { ServiceBillingSettings } from "../../../lib/service-billing-settings";
export type TextKey = Exclude<keyof ServiceBillingSettings, "version" | "showLogo" | "offerValidityDays" | "paymentTermDays">;
export type BillingField = { key: TextKey; label: string; maxLength: number; required?: boolean; lines?: number; type?: "email" | "url" | "tel"; pattern?: string };
export const senderFields: BillingField[] = [
  { key: "organizationName", label: "Organisation / Vereinsname", maxLength: 120, required: true },
  { key: "organizationDetails", label: "Organisationszuordnung", maxLength: 160, lines: 3 },
  { key: "department", label: "Abteilung / Funktion", maxLength: 80 },
  { key: "street", label: "Straße und Hausnummer", maxLength: 120, required: true },
  { key: "postalCode", label: "Postleitzahl", maxLength: 16, required: true },
  { key: "city", label: "Ort", maxLength: 80, required: true },
  { key: "email", label: "Kontakt-E-Mail", maxLength: 120, type: "email" },
  { key: "phone", label: "Telefon", maxLength: 50, type: "tel" },
  { key: "website", label: "Website", maxLength: 200, type: "url" },
];
export const bankFields: BillingField[] = [
  { key: "bankName", label: "Bank / Geschäftsstelle", maxLength: 120, lines: 2, required: true },
  { key: "iban", label: "IBAN", maxLength: 42, required: true },
  { key: "bic", label: "BIC", maxLength: 11, pattern: "[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?" },
  { key: "legalDetails", label: "Vereins- und Registerangaben", maxLength: 600, lines: 8 },
  { key: "footerText", label: "Weiterer Fußzeilentext", maxLength: 1000, lines: 8 },
];
export const termsFields: BillingField[] = [
  { key: "signatoryName", label: "Name in der Grußformel", maxLength: 100 },
  { key: "signatoryRole", label: "Funktion in der Grußformel", maxLength: 100 },
  { key: "taxNote", label: "Steuerhinweis", maxLength: 400, lines: 4 },
  { key: "offerTerms", label: "Angebotsbedingungen", maxLength: 800, lines: 8 },
];
