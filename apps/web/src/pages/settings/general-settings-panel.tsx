import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InlineError } from "../../components/state-panels";
import { SearchableSelect } from "../../components/searchable-select";
import { Field } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import type { GeneralSettings } from "../../lib/admin-settings-types";
import { SettingsPanel } from "./settings-panel";
import { getTimezoneOptions } from "./timezone-options";

export function GeneralSettingsPanel({ initial }: { initial: GeneralSettings }) {
  const [draft, setDraft] = useState(initial);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: rescueBaseApi.updateGeneralSettings,
    onSuccess: async (settings) => {
      setDraft(settings);
      queryClient.setQueryData(["setup-status"], (current: { initialized: boolean } & Partial<GeneralSettings> | undefined) =>
        current ? { ...current, ...settings } : current
      );
      queryClient.setQueryData(["session"], (current: { user: unknown } & Partial<GeneralSettings> | undefined) =>
        current ? { ...current, ...settings } : current
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    }
  });
  return (
    <SettingsPanel className="settings-panel-compact" isSaving={mutation.isPending} onSave={() => mutation.mutate(draft)} title="Organisation und Zeit">
      <div className="form-grid form-grid-two">
        <Field label="App-Name"><input onChange={(event) => setDraft({ ...draft, appName: event.target.value })} value={draft.appName} /></Field>
        <Field label="Untertitel"><input onChange={(event) => setDraft({ ...draft, appSubtitle: event.target.value })} value={draft.appSubtitle} /></Field>
        <Field label="Zeitzone">
          <SearchableSelect
            ariaLabel="Zeitzone"
            noResultsLabel="Keine Zeitzone gefunden"
            onChange={(timezone) => setDraft({ ...draft, timezone })}
            options={getTimezoneOptions(draft.timezone)}
            placeholder="Zeitzone suchen"
            value={draft.timezone}
          />
        </Field>
        <div className="settings-subsection">
          <strong>Branding</strong>
          <span>Sichtbarkeit im Login und in der Navigation.</span>
          <label className="check-field"><input checked={draft.showLogo} onChange={(event) => setDraft({ ...draft, showLogo: event.target.checked })} type="checkbox" /><span>Logo anzeigen</span></label>
          <label className="check-field"><input checked={draft.showAppName} onChange={(event) => setDraft({ ...draft, showAppName: event.target.checked })} type="checkbox" /><span>RescueBase-Schriftzug anzeigen</span></label>
          <label className="check-field"><input checked={draft.showAppSubtitle} onChange={(event) => setDraft({ ...draft, showAppSubtitle: event.target.checked })} type="checkbox" /><span>Sanitätslager-Schriftzug anzeigen</span></label>
        </div>
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
