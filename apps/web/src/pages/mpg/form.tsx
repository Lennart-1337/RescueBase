import { useState, type ReactNode } from "react";
import { Button, CheckboxField, Field } from "../../components/ui";

export type FormValues = Record<string, string | number | boolean | string[]>;
export type FormField = { name: string; label: string; type?: "text" | "date" | "datetime-local" | "number" | "textarea" | "checkbox"; required?: boolean; min?: number; max?: number; multiple?: boolean; options?: { value: string; label: string }[] };
export function MpgForm({ title, fields, initial = {}, onSubmit, children, formId, onPendingChange, onSuccess, showHeader = true, showSubmit = true, submitLabel = "Speichern" }: {
  title: string; fields: FormField[]; initial?: FormValues; onSubmit: (values: FormValues) => Promise<unknown>; children?: ReactNode; formId?: string; onPendingChange?: (pending: boolean) => void; onSuccess?: () => void; showHeader?: boolean; showSubmit?: boolean; submitLabel?: string;
}) {
  const [values, setValues] = useState<FormValues>(initial);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return <form aria-label={title} className="mpg-form" id={formId} onSubmit={async (event) => {
    event.preventDefault(); setPending(true); onPendingChange?.(true); setError("");
    try {
      const body: FormValues = {};
      for (const field of fields) {
        const value = values[field.name];
        if (value !== undefined && value !== "") body[field.name] = field.type === "number" ? Number(value) : value;
      }
      await onSubmit(body);
      onSuccess?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen."); }
    finally { setPending(false); onPendingChange?.(false); }
  }}>
    {showHeader ? <h3>{title}</h3> : null}<div className="mpg-fields">{fields.map((field) => field.type === "checkbox" ? <CheckboxField checked={Boolean(values[field.name])} key={field.name} label={field.label} layout="split" onChange={(event) => setValues({ ...values, [field.name]: event.target.checked })} /> : <Field key={field.name} label={field.label} required={field.required}>
      {field.options ? <select multiple={field.multiple} required={field.required} value={field.multiple ? (values[field.name] as string[] ?? []) : String(values[field.name] ?? "")} onChange={(event) => setValues({ ...values, [field.name]: field.multiple ? [...event.target.selectedOptions].map(option => option.value) : event.target.value })}>{!field.multiple ? <option value="">Bitte auswählen</option> : null}{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        : field.type === "textarea" ? <textarea required={field.required} value={String(values[field.name] ?? "")} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} />
          : <input type={field.type ?? "text"} min={field.min} max={field.max} step={field.type === "number" ? "any" : undefined} required={field.required} value={String(values[field.name] ?? "")} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} />}
    </Field>)}</div>{children}{error ? <p role="alert" className="mpg-error">{error}</p> : null}{showSubmit ? <Button type="submit" loading={pending}>{submitLabel}</Button> : null}
  </form>;
}
