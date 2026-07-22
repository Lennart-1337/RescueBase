import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InlineError } from "../../components/state-panels";
import { Button, CheckboxField, Field } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import { formatDateTime } from "../../app/formatters";
import type { AlertSettings } from "../../lib/admin-settings-types";
import { settingsKeys } from "../../queries/settings";
import { SettingsPanel } from "./settings-panel";

export function AlertSettingsPanel({ initial }: { initial: AlertSettings }) {
  const [draft, setDraft] = useState(initial);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: rescueBaseApi.updateAlertSettings,
    onSuccess: async (settings) => {
      setDraft(settings);
      await queryClient.invalidateQueries({ queryKey: settingsKeys.admin() });
    }
  });
  const digestMutation = useMutation({
    mutationFn: rescueBaseApi.runDailyDigest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: settingsKeys.admin() });
    }
  });
  return (
    <SettingsPanel
      className="settings-panel-compact"
      extraAction={<Button loading={digestMutation.isPending} onClick={() => digestMutation.mutate()} type="button" variant="secondary">Digest jetzt senden</Button>}
      isSaving={mutation.isPending}
      onSave={() => mutation.mutate({ dailyDigestEnabled: draft.dailyDigestEnabled, dailyDigestTime: draft.dailyDigestTime, warningWindowDays: draft.warningWindowDays })}
      title="Warnungen"
    >
      <div className="form-grid settings-toggle-row">
        <CheckboxField checked={draft.dailyDigestEnabled} label="Täglichen Digest senden" onChange={(event) => setDraft({ ...draft, dailyDigestEnabled: event.target.checked })} />
      </div>
      <div className="form-grid form-grid-two settings-fields-row">
        <Field label="Digest-Uhrzeit"><input disabled={!draft.dailyDigestEnabled} onChange={(event) => setDraft({ ...draft, dailyDigestTime: event.target.value })} type="time" value={draft.dailyDigestTime} /></Field>
        <Field label="Warnvorlauf in Tagen"><input min="1" onChange={(event) => setDraft({ ...draft, warningWindowDays: Number(event.target.value) })} type="number" value={draft.warningWindowDays} /></Field>
      </div>
      {digestMutation.data ? <p className="settings-meta">{digestMutation.data.warningCount > 0 ? `Digest an ${digestMutation.data.recipientCount} Empfänger mit ${digestMutation.data.warningCount} Warnungen gesendet.` : "Keine passenden offenen Warnungen für den Digest."}</p> : null}
      <p className="settings-meta">Letzter Digest-Lauf: {draft.lastDigestRunAt ? formatDateTime(draft.lastDigestRunAt) : "noch nicht ausgeführt"}</p>
      <p className="settings-meta">Letzte erfolgreiche Zustellung: {draft.lastDigestSentAt ? formatDateTime(draft.lastDigestSentAt) : "noch nicht gesendet"}</p>
      {mutation.error ? <InlineError error={mutation.error} /> : null}
      {digestMutation.error ? <InlineError error={digestMutation.error} /> : null}
    </SettingsPanel>
  );
}
