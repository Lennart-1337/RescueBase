import type { ReactNode } from "react";
export type Values = Record<string, unknown>;
export type ServiceField = {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "number"
    | "decimal"
    | "textarea"
    | "date"
    | "datetime-local"
    | "checkbox";
  required?: boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  hint?: string;
  group?: string;
  disclosure?: boolean;
  when?: { field: string; equals: string | number | boolean };
};
export type ServiceFormProps = {
  title: string;
  fields: ServiceField[];
  initial?: Values;
  onSubmit: (values: Values) => Promise<unknown>;
  submitLabel?: string;
  children?: ReactNode;
  disabled?: boolean;
  hideLegend?: boolean;
};
export const text = (
  name: string,
  label: string,
  required = false,
): ServiceField => ({
  name,
  label,
  required,
});
export const number = (
  name: string,
  label: string,
  required = false,
): ServiceField => ({
  name,
  label,
  required,
  type: "number",
  min: 0,
});
export const datetime = (
  name: string,
  label: string,
  required = false,
): ServiceField => ({
  name,
  label,
  required,
  type: "datetime-local",
});
export const options = (
  name: string,
  label: string,
  entries: { id: string; name: string }[],
  required = false,
): ServiceField => ({
  name,
  label,
  required,
  options: entries.map((entry) => ({ value: entry.id, label: entry.name })),
});
