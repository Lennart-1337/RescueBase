import { RefreshCw, Save } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import type { InventoryAutomationConfig } from "../../lib/types";

export function AutomationPanel(props: {
  config: InventoryAutomationConfig;
  error: Error | null;
  isReconciling: boolean;
  isSaving: boolean;
  onReconcile: () => void;
  onSave: () => void;
  onTimeChange: (value: string) => void;
  time: string;
}) {
  return (
    <Panel>
      <div className="panel-header">
        <div><h2>Automatik</h2><p>Tägliche Prüfung der Sollbestände.</p></div>
        <div className="topbar-actions">
          <Button disabled={props.isReconciling} onClick={props.onReconcile} type="button" variant="secondary"><RefreshCw data-icon="inline-start" />Jetzt prüfen</Button>
          <Button disabled={props.isSaving} onClick={props.onSave} type="button"><Save data-icon="inline-start" />Speichern</Button>
        </div>
      </div>
      <div className="form-grid form-grid-three">
        <Field label="Tägliche Uhrzeit">
          <input type="time" value={props.time} onChange={(event) => props.onTimeChange(event.target.value)} />
        </Field>
        <div className="debug-hint">
          Letzte Prüfung: {props.config.lastReconciledAt ? new Date(props.config.lastReconciledAt).toLocaleString("de-DE") : "noch nicht ausgeführt"}
        </div>
      </div>
      {props.error ? <InlineError error={props.error} /> : null}
    </Panel>
  );
}
