import type { ServiceField, Values } from "./form-types";
import { germanDateValue } from "./german-date-input";
import {
  berlinChoices,
  berlinInput,
  berlinIso,
  type BerlinOccurrence,
} from "./time";
export type Occurrences = Record<string, BerlinOccurrence | undefined>;
export const isFieldActive = (field: ServiceField, values: Values) =>
  !field.when || values[field.when.field] === field.when.equals;
export function initialFormValues(
  fields: ServiceField[],
  initial: Values,
): Values {
  return Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.type === "datetime-local"
        ? berlinInput(initial[field.name] as string)
        : (initial[field.name] ?? (field.type === "checkbox" ? false : "")),
    ]),
  );
}
export function initialOccurrences(
  fields: ServiceField[],
  initial: Values,
): Occurrences {
  return Object.fromEntries(
    fields
      .filter((field) => field.type === "datetime-local")
      .map((field) => [
        field.name,
        berlinChoices(berlinInput(initial[field.name] as string)).find(
          (option) =>
            Date.parse(option.iso) === Date.parse(String(initial[field.name])),
        )?.value,
      ]),
  );
}
export function submitFormValues(
  fields: ServiceField[],
  values: Values,
  occurrences: Occurrences,
  initial: Values,
): Values {
  return Object.fromEntries(
    fields
      .filter((field) => isFieldActive(field, values))
      .map((field) => {
        const value = values[field.name];
        if (value === "") return [field.name, null];
        if (field.type === "number") return [field.name, Number(value)];
        if (field.type === "decimal")
          return [field.name, String(value).trim().replace(",", ".")];
        if (field.type === "date") return [field.name, germanDateValue(String(value))];
        if (field.type === "datetime-local") {
          const iso = berlinIso(germanDateValue(String(value), true), occurrences[field.name]);
          const original = initial[field.name];
          return [
            field.name,
            original && Date.parse(String(original)) === Date.parse(iso)
              ? original
              : iso,
          ];
        }
        return [field.name, value];
      }),
  );
}
