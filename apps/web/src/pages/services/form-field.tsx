import { CheckboxField, Field } from "../../components/ui";
import type { ServiceField } from "./form-types";
import { berlinChoices, type BerlinOccurrence } from "./time";
export function FormField({
  field,
  value,
  occurrence,
  update,
  selectOccurrence,
}: {
  field: ServiceField;
  value: unknown;
  occurrence?: BerlinOccurrence;
  update: (value: unknown) => void;
  selectOccurrence: (value: BerlinOccurrence) => void;
}) {
  if (field.type === "checkbox")
    return (
      <CheckboxField
        label={field.label}
        checked={Boolean(value)}
        onChange={(event) => update(event.target.checked)}
      />
    );
  const choices =
    field.type === "datetime-local" ? berlinChoices(String(value ?? "")) : [];
  return (
    <div
      className={field.type === "textarea" ? "service-field-wide" : undefined}
    >
      <Field label={field.label} required={field.required}>
        {field.options ? (
          <select
            required={field.required}
            value={String(value ?? "")}
            onChange={(event) => update(event.target.value)}
          >
            <option value="">Bitte auswählen</option>
            {field.options.map((option) => (
              <option
                key={`${option.value}-${option.label}`}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        ) : field.type === "textarea" ? (
          <textarea
            required={field.required}
            value={String(value ?? "")}
            onChange={(event) => update(event.target.value)}
          />
        ) : (
          <input
            required={field.required}
            type={field.type === "decimal" ? "text" : (field.type ?? "text")}
            inputMode={field.type === "decimal" ? "decimal" : undefined}
            min={field.min}
            max={field.max}
            step={field.type === "number" ? 1 : undefined}
            value={String(value ?? "")}
            onChange={(event) => update(event.target.value)}
          />
        )}
        {field.hint ? <small>{field.hint}</small> : null}
      </Field>
      {choices.length > 1 ? (
        <Field label={`${field.label}: Zeitumstellung`} required>
          <select
            required
            value={occurrence ?? ""}
            onChange={(event) =>
              selectOccurrence(event.target.value as BerlinOccurrence)
            }
          >
            <option value="">Uhrzeit ist doppelt – bitte auswählen</option>
            {choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
    </div>
  );
}
