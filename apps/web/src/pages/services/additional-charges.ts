import type { Service } from "./types";
export type AdditionalCharge = Service["additionalCharges"][number];

export function normalizeAdditionalCharges(charges: AdditionalCharge[]) {
  return charges.map((charge) => {
    const label = charge.label.trim();
    const amount = charge.amount.trim().replace(",", ".");
    if (!label || label.length > 191 || !/^\d{1,10}(\.\d{1,2})?$/.test(amount))
      throw new Error("Bitte für jeden Posten eine Bezeichnung und einen gültigen Betrag mit höchstens zwei Nachkommastellen eingeben.");
    return { ...charge, label, amount };
  });
}
