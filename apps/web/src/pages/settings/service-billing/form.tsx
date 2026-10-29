import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InlineError } from "../../../components/state-panels";
import { Button, CheckboxField } from "../../../components/ui";
import { billingSettingsKey, saveServiceBillingSettings, type ServiceBillingSettings } from "../../../lib/service-billing-settings";
import { BillingFieldGroup } from "./field-group";
import { bankFields, senderFields, termsFields } from "./fields";
import { Field } from "../../../components/ui";
export function BillingSettingsForm({ initial }: { initial: ServiceBillingSettings }) {
  const [draft, setDraft] = useState(initial), [saved, setSaved] = useState(false);
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: (settings: ServiceBillingSettings) => saveServiceBillingSettings(settings), onSuccess: async (settings) => {
    setDraft(settings); setSaved(true); client.setQueryData(billingSettingsKey, settings);
    await client.invalidateQueries({ queryKey: ["services", "/billing-settings"] });
  } });
  const update = <K extends keyof ServiceBillingSettings>(key: K, value: ServiceBillingSettings[K]) => {
    setSaved(false); setDraft((previous) => ({ ...previous, [key]: value }));
  };
  return <form aria-label="Angebote und Rechnungen" className="billing-settings-form" onSubmit={(event) => {
    event.preventDefault(); setSaved(false); mutation.mutate(draft);
  }}>
    <fieldset className="billing-settings-fields" disabled={mutation.isPending}>
      <legend className="billing-settings-sr-only">Dokumenteinstellungen</legend>
      <BillingFieldGroup title="Absender und Kontakt" fields={senderFields} draft={draft} onChange={update} />
      <CheckboxField label="DLRG-Logo im PDF anzeigen" checked={draft.showLogo} onChange={(event) => update("showLogo", event.target.checked)} />
      <BillingFieldGroup title="Bankverbindung und Fußzeile" fields={bankFields} draft={draft} onChange={update} />
      <fieldset className="billing-settings-group"><legend>Fristen</legend><div className="billing-settings-grid">
        <Field label="Angebotsgültigkeit in Tagen" required><input type="number" min={1} max={365} step={1} required value={Number.isNaN(draft.offerValidityDays) ? "" : draft.offerValidityDays} onChange={(event) => update("offerValidityDays", event.target.valueAsNumber)} /></Field>
        <Field label="Zahlungsfrist in Tagen" required><input type="number" min={1} max={365} step={1} required value={Number.isNaN(draft.paymentTermDays) ? "" : draft.paymentTermDays} onChange={(event) => update("paymentTermDays", event.target.valueAsNumber)} /></Field>
      </div></fieldset>
      <BillingFieldGroup title="Grußformel und Bedingungen" fields={termsFields} draft={draft} onChange={update} />
    </fieldset>
    <div className="billing-settings-actions">
      <Button loading={mutation.isPending} type="submit">Dokumenteinstellungen speichern</Button>
      {saved ? <p role="status">Einstellungen gespeichert.</p> : null}
    </div>
    {mutation.error ? <InlineError error={mutation.error} /> : null}
  </form>;
}
