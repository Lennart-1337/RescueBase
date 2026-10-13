import { useId, useState, type ReactNode } from "react";
import { Plus, Save, X } from "lucide-react";
import { Button, Dialog } from "../../components/ui";
import { MpgForm, type FormField, type FormValues } from "./form";

export function MpgFormDialog(props: {
  children?: ReactNode;
  description?: string;
  fields: FormField[];
  initial?: FormValues;
  intent?: "create" | "save";
  onClose: () => void;
  onSubmit: (values: FormValues) => Promise<unknown>;
  open: boolean;
  size?: "default" | "wide";
  submitLabel?: string;
  title: string;
}) {
  const formId = useId();
  const [pending, setPending] = useState(false);
  const SubmitIcon = props.intent === "create" ? Plus : Save;
  return <Dialog actions={<><Button disabled={pending} onClick={props.onClose} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button><Button form={formId} loading={pending} type="submit"><SubmitIcon data-icon="inline-start" />{props.submitLabel ?? "Speichern"}</Button></>} description={props.description} onClose={props.onClose} open={props.open} size={props.size} title={props.title}>
    <MpgForm fields={props.fields} formId={formId} initial={props.initial} onPendingChange={setPending} onSubmit={props.onSubmit} onSuccess={props.onClose} showHeader={false} showSubmit={false} title={props.title}>{props.children}</MpgForm>
  </Dialog>;
}
