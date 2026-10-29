import type { BillingSettingsData } from "./defaults.js";
type TextKey = {
  [K in keyof BillingSettingsData]: BillingSettingsData[K] extends string
    ? K
    : never;
}[keyof BillingSettingsData];
export const billingTextFields: Record<
  TextKey,
  { label: string; max: number; lines: number; required?: boolean }
> = {
  organizationName: {
    label: "Organisation",
    max: 120,
    lines: 1,
    required: true,
  },
  organizationDetails: { label: "Organisationszusatz", max: 160, lines: 3 },
  department: { label: "Abteilung", max: 80, lines: 1 },
  street: {
    label: "Straße und Hausnummer",
    max: 120,
    lines: 1,
    required: true,
  },
  postalCode: { label: "Postleitzahl", max: 16, lines: 1, required: true },
  city: { label: "Ort", max: 80, lines: 1, required: true },
  email: { label: "E-Mail", max: 120, lines: 1 },
  phone: { label: "Telefon", max: 50, lines: 1 },
  website: { label: "Website", max: 200, lines: 1 },
  bankName: { label: "Bank", max: 120, lines: 2, required: true },
  iban: { label: "IBAN", max: 42, lines: 1, required: true },
  bic: { label: "BIC", max: 11, lines: 1 },
  legalDetails: { label: "Register- und Steuerangaben", max: 600, lines: 8 },
  footerText: { label: "Fußzeilentext", max: 1000, lines: 8 },
  signatoryName: { label: "Name im Gruß", max: 100, lines: 1 },
  signatoryRole: { label: "Funktion im Gruß", max: 100, lines: 1 },
  taxNote: { label: "Steuerhinweis", max: 400, lines: 4 },
  offerTerms: { label: "Angebotsbedingungen", max: 800, lines: 8 },
};
