import { useState } from "react";
import { Button } from "../../components/ui";
import { FormField } from "./form-field";
import { FormGroup } from "./form-group";
import type { ServiceFormProps, Values } from "./form-types";
import {
  initialFormValues,
  initialOccurrences,
  isFieldActive,
  submitFormValues,
  type Occurrences,
} from "./form-values";
import type { BerlinOccurrence } from "./time";
import "./form.css";
export { text, number, datetime, options } from "./form-types";
export type { ServiceField, Values } from "./form-types";

export function ServiceForm(props: ServiceFormProps) {
  const initial = props.initial ?? {};
  const key = JSON.stringify(
    props.fields.map((field) => [field.name, initial[field.name] ?? null]),
  );
  return <ServiceFormState key={key} {...props} initial={initial} />;
}
function ServiceFormState({
  title,
  fields,
  initial = {},
  onSubmit,
  submitLabel = "Speichern",
  children,
  disabled = false,
  hideLegend = false,
}: ServiceFormProps) {
  const [values, setValues] = useState<Values>(() =>
    initialFormValues(fields, initial),
  );
  const [occurrences, setOccurrences] = useState<Occurrences>(() =>
    initialOccurrences(fields, initial),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const active = fields.filter((field) => isFieldActive(field, values));
  const groups = [
    ...new Set(
      active
        .map((field) => field.group)
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  const renderField = (field: (typeof fields)[number]) => (
    <FormField
      key={field.name}
      field={field}
      value={values[field.name]}
      occurrence={occurrences[field.name]}
      update={(value) => {
        setValues((current) => ({ ...current, [field.name]: value }));
        if (field.type === "datetime-local")
          setOccurrences((current) => ({
            ...current,
            [field.name]: undefined,
          }));
      }}
      selectOccurrence={(value: BerlinOccurrence) =>
        setOccurrences((current) => ({ ...current, [field.name]: value }))
      }
    />
  );
  return (
    <form
      aria-label={title}
      className="service-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setPending(true);
        try {
          await onSubmit(
            submitFormValues(fields, values, occurrences, initial),
          );
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Speichern fehlgeschlagen.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <fieldset disabled={disabled || pending}>
        {hideLegend ? null : <legend>{title}</legend>}
        <div className="service-fields">
          {active.filter((field) => !field.group).map(renderField)}
        </div>
        {groups.map((group) => (
          <FormGroup
            key={group}
            title={group}
            disclosure={active.some(
              (field) => field.group === group && field.disclosure,
            )}
          >
            {active.filter((field) => field.group === group).map(renderField)}
          </FormGroup>
        ))}
        {children}
      </fieldset>
      {error ? (
        <p className="service-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={disabled} loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
