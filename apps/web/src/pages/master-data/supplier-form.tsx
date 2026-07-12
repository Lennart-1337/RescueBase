import { Field } from "../../components/ui";

export type SupplierFormValues = {
  city: string;
  contactPerson: string;
  country: string;
  email: string;
  name: string;
  notes: string;
  phone: string;
  postalCode: string;
  street: string;
  website: string;
};

export function SupplierForm(props: {
  autoFocus?: boolean;
  onChange: (patch: Partial<SupplierFormValues>) => void;
  value: SupplierFormValues;
}) {
  return (
    <div className="supplier-form-grid">
      <Field label="Name"><input autoFocus={props.autoFocus} onChange={(event) => props.onChange({ name: event.target.value })} value={props.value.name} /></Field>
      <Field label="Ansprechperson"><input onChange={(event) => props.onChange({ contactPerson: event.target.value })} value={props.value.contactPerson} /></Field>
      <Field label="E-Mail"><input onChange={(event) => props.onChange({ email: event.target.value })} type="email" value={props.value.email} /></Field>
      <Field label="Telefon"><input onChange={(event) => props.onChange({ phone: event.target.value })} value={props.value.phone} /></Field>
      <Field label="Website"><input onChange={(event) => props.onChange({ website: event.target.value })} placeholder="https://…" value={props.value.website} /></Field>
      <Field label="Straße"><input onChange={(event) => props.onChange({ street: event.target.value })} value={props.value.street} /></Field>
      <Field label="PLZ"><input onChange={(event) => props.onChange({ postalCode: event.target.value })} value={props.value.postalCode} /></Field>
      <Field label="Ort"><input onChange={(event) => props.onChange({ city: event.target.value })} value={props.value.city} /></Field>
      <Field label="Land"><input onChange={(event) => props.onChange({ country: event.target.value })} value={props.value.country} /></Field>
      <Field className="supplier-form-notes" label="Notizen"><textarea onChange={(event) => props.onChange({ notes: event.target.value })} rows={4} value={props.value.notes} /></Field>
    </div>
  );
}
