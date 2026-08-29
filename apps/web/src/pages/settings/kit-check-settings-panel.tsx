import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InlineError } from "../../components/state-panels";
import { CheckboxField, Field } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import type { KitCheckSettings } from "../../lib/admin-settings-types";
import { settingsKeys } from "../../queries/settings";
import { SettingsPanel } from "./settings-panel";

export function KitCheckSettingsPanel({ initial }: { initial: KitCheckSettings }) {
  const [draft, setDraft] = useState(initial);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: rescueBaseApi.updateKitCheckSettings,
    onSuccess: async (settings) => {
      setDraft(settings);
      await queryClient.invalidateQueries({ queryKey: settingsKeys.admin() });
    }
  });

  return (
    <SettingsPanel className="settings-panel-compact" isSaving={mutation.isPending} onSave={() => mutation.mutate(draft)} title="Rucksackprüfungen">
      <div className="form-grid settings-toggle-row">
        <CheckboxField checked={draft.enabled} label="Monatliche Rucksackprüfungen aktiv" onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />
      </div>
      <div className="form-grid form-grid-two settings-fields-row">
        <Field label="Prüfintervall in Monaten"><input disabled={!draft.enabled} max="24" min="1" onChange={(event) => setDraft({ ...draft, intervalMonths: Number(event.target.value) })} type="number" value={draft.intervalMonths} /></Field>
        <Field label="Warnvorlauf in Tagen"><input disabled={!draft.enabled} max="365" min="0" onChange={(event) => setDraft({ ...draft, warningLeadDays: Number(event.target.value) })} type="number" value={draft.warningLeadDays} /></Field>
      </div>
      <p className="settings-meta">Der nächste Termin ergibt sich aus dem letzten Check oder der Anlage des Rucksacks. Mit 0 Tagen erscheint die Warnung erst bei Fälligkeit.</p>
      {mutation.error ? <InlineError error={mutation.error} /> : null}
    </SettingsPanel>
  );
}
