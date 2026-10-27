import { BadRequestException } from "@nestjs/common";
import { array, decimal, id, object, string, unique } from "./input.js";
import type { ServiceAdditionalCharge } from "./types.js";
export function normalizeAdditionalCharges(value: unknown): ServiceAdditionalCharge[] {
  if (value !== undefined && !Array.isArray(value))
    throw new BadRequestException("Freie Posten müssen eine Liste sein.");
  const charges = array(value).map((value) => {
    const charge = object(value);
    return {
      id: id(charge.id),
      label: string(charge.label, "Bezeichnung", true),
      amount: decimal(charge.amount, 2),
    };
  });
  unique(charges.map((charge) => charge.id), "Freier Posten");
  return charges;
}
