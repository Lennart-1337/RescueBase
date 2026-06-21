import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InlineError } from "../../components/state-panels";
import { Field } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import type { GeneralSettings } from "../../lib/admin-settings-types";
import { SettingsPanel } from "./settings-panel";

export function GeneralSettingsPanel({ initial }: { initial: GeneralSettings }) {
  const [draft, setDraft] = useState(initial);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: rescueBaseApi.updateGeneralSettings,
    onSuccess: async (settings) => {
      setDraft(settings);
      await queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    }
  });
  return (
    <SettingsPanel description="Gemeinsame Zeitzone und Standards für neue Konten." isSaving={mutation.isPending} onSave={() => mutation.mutate(draft)} title="Organisation und Zeit">
      <div className="form-grid form-grid-two">
        <Field label="Zeitzone"><input onChange={(event) => setDraft({ ...draft, timezone: event.target.value })} value={draft.timezone} /></Field>
        <div className="settings-subsection">
          <strong>Nachfüllaufträge</strong>
          <span>Standard für neu eingeladene Benutzer.</span>
          <label className="check-field"><input checked={draft.newUserOrderNotificationsDefaultEnabled} onChange={(event) => setDraft({ ...draft, newUserOrderNotificationsDefaultEnabled: event.target.checked })} type="checkbox" /><span>Auftrags-E-Mails standardmäßig aktiv</span></label>
        </div>
      </div>
      {mutation.error ? <InlineError error={mutation.error} /> : null}
    </SettingsPanel>
  );
}
