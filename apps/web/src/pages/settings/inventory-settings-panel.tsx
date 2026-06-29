import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "../../app/formatters";
import { InlineError } from "../../components/state-panels";
import { Field } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import type { InventorySettings } from "../../lib/admin-settings-types";
import { settingsKeys } from "../../queries/settings";
import { SettingsPanel } from "./settings-panel";

export function InventorySettingsPanel({ initial }: { initial: InventorySettings }) {
  const [draft, setDraft] = useState(initial);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: rescueBaseApi.updateAdminInventorySettings,
    onSuccess: async (settings) => {
      setDraft(settings);
      await queryClient.invalidateQueries({ queryKey: settingsKeys.admin() });
    }
  });
  return (
    <SettingsPanel className="settings-panel-compact" isSaving={mutation.isPending} onSave={() => mutation.mutate({ enabled: draft.enabled, dailyReconcileTime: draft.dailyReconcileTime })} title="Lagerautomatik">
      <div className="form-grid settings-toggle-row">
        <label className="check-field"><input checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} type="checkbox" /><span>Automatische Bestandsprüfung aktiv</span></label>
      </div>
      <div className="form-grid form-grid-one settings-fields-row">
        <Field label="Prüfzeit"><input disabled={!draft.enabled} onChange={(event) => setDraft({ ...draft, dailyReconcileTime: event.target.value })} type="time" value={draft.dailyReconcileTime} /></Field>
      </div>
      <p className="settings-meta">Letzte Prüfung: {draft.lastReconciledAt ? formatDateTime(draft.lastReconciledAt) : "noch nicht ausgeführt"}</p>
      {mutation.error ? <InlineError error={mutation.error} /> : null}
    </SettingsPanel>
  );
}
