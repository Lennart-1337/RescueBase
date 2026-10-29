import { Field } from "../../../components/ui";
import type { ServiceBillingSettings } from "../../../lib/service-billing-settings";
import type { BillingField, TextKey } from "./fields";
export function BillingFieldGroup({ title, fields, draft, onChange }: {
  title: string; fields: BillingField[]; draft: ServiceBillingSettings; onChange: (key: TextKey, value: string) => void;
}) {
  return <fieldset className="billing-settings-group">
    <legend>{title}</legend>
    <div className="billing-settings-grid">{fields.map((field) => <Field key={field.key} label={field.label} required={field.required} className={field.lines ? "billing-settings-wide" : undefined}>
      {field.lines ? <textarea rows={Math.min(field.lines, 4)} maxLength={field.maxLength} required={field.required} value={draft[field.key]} onChange={(event) => {
        const value = event.target.value;
        event.target.setCustomValidity(value.trim().split(/\r\n?|\n/).length > field.lines! ? `Höchstens ${field.lines} Zeilen eingeben.` : "");
        onChange(field.key, value);
      }} /> : <input type={field.type ?? "text"} maxLength={field.maxLength} required={field.required} pattern={field.pattern} value={draft[field.key]} onChange={(event) => onChange(field.key, event.target.value)} />}
    </Field>)}</div>
  </fieldset>;
}
