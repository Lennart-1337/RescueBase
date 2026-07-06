import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InlineError } from "../../components/state-panels";
import { SearchableSelect } from "../../components/searchable-select";
import { CheckboxField, Field } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import type { GeneralSettings } from "../../lib/admin-settings-types";
import { authKeys } from "../../queries/auth";
import { settingsKeys } from "../../queries/settings";
import { SettingsPanel } from "./settings-panel";
import { getTimezoneOptions } from "./timezone-options";

export function GeneralSettingsPanel({ initial }: { initial: GeneralSettings }) {
  const [draft, setDraft] = useState(initial);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: rescueBaseApi.updateGeneralSettings,
    onSuccess: async (settings) => {
      setDraft(settings);
      queryClient.setQueryData(authKeys.setupStatus(), (current: { initialized: boolean } & Partial<GeneralSettings> | undefined) =>
        current ? { ...current, ...settings } : current
      );
      queryClient.setQueryData(authKeys.session(), (current: { user: unknown } & Partial<GeneralSettings> | undefined) =>
        current ? { ...current, ...settings } : current
      );
      await queryClient.invalidateQueries({ queryKey: settingsKeys.admin() });
    }
  });
  return (
    <SettingsPanel className="settings-panel-compact" isSaving={mutation.isPending} onSave={() => mutation.mutate(draft)} title="Organisation und Zeit">
      <div className="form-grid settings-split-grid">
        <div className="settings-field-stack">
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
        </div>
        <div className="settings-option-stack">
          <div className="settings-subsection">
            <strong>Branding</strong>
            <span>Sichtbarkeit im Login und in der Navigation.</span>
            <CheckboxField checked={draft.showLogo} label="Logo anzeigen" onChange={(event) => setDraft({ ...draft, showLogo: event.target.checked })} />
            <CheckboxField checked={draft.showAppName} label="RescueBase-Schriftzug anzeigen" onChange={(event) => setDraft({ ...draft, showAppName: event.target.checked })} />
            <CheckboxField checked={draft.showAppSubtitle} label="Sanitätslager-Schriftzug anzeigen" onChange={(event) => setDraft({ ...draft, showAppSubtitle: event.target.checked })} />
          </div>
          <div className="settings-subsection">
            <strong>Nachfüllaufträge</strong>
            <span>Standard für neu eingeladene Benutzer.</span>
            <CheckboxField checked={draft.newUserOrderNotificationsDefaultEnabled} label="Auftrags-E-Mails standardmäßig aktiv" onChange={(event) => setDraft({ ...draft, newUserOrderNotificationsDefaultEnabled: event.target.checked })} />
          </div>
        </div>
      </div>
      {mutation.error ? <InlineError error={mutation.error} /> : null}
    </SettingsPanel>
  );
}
