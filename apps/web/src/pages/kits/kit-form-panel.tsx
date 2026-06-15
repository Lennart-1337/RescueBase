import { PackageCheck, Plus, Save, X } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import type { KitTemplate, Location } from "../../lib/types";

export function KitFormPanel(props: {
  code: string;
  createError: Error | null;
  editingId: string | null;
  locationId: string;
  locations: Location[];
  name: string;
  onCancel: () => void;
  onCodeChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  onTemplateChange: (value: string) => void;
  templateId: string;
  templates: KitTemplate[];
  updateError: Error | null;
}) {
  const selectedLocationId = props.locationId || props.locations[0]?.id || "";
  const selectedTemplateId = props.templateId || props.templates[0]?.id || "";
  const canSubmit = Boolean(props.name.trim() && props.code.trim() && selectedLocationId && selectedTemplateId);
  return (
    <Panel>
      <div className="panel-header"><div><h2>{props.editingId ? "Rucksack bearbeiten" : "Rucksack anlegen"}</h2><p>{props.editingId ? "Name, Code, Standort und Vorlagenzuordnung lassen sich nachpflegen." : "Neue Rucksäcke erhalten automatisch einen geheimen QR/NFC-Link."}</p></div><PackageCheck /></div>
      <div className="form-grid form-grid-four">
        <Field label="Name"><input value={props.name} onChange={(event) => props.onNameChange(event.target.value)} /></Field>
        <Field label="Rucksackkennung"><input value={props.code} onChange={(event) => props.onCodeChange(event.target.value)} /></Field>
        <Field label="Standort"><select value={selectedLocationId} onChange={(event) => props.onLocationChange(event.target.value)}>{props.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
        <Field label="Vorlage"><select value={selectedTemplateId} onChange={(event) => props.onTemplateChange(event.target.value)}>{props.templates.map((template) => <option key={template.id} value={template.id}>{template.name} v{template.version}</option>)}</select></Field>
      </div>
      {props.createError ? <InlineError error={props.createError} /> : null}
      {props.updateError ? <InlineError error={props.updateError} /> : null}
      <div className="form-actions">
        <Button disabled={!canSubmit} onClick={props.onSubmit} type="button">{props.editingId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}{props.editingId ? "Rucksack speichern" : "Rucksack anlegen"}</Button>
        {props.editingId ? <Button onClick={props.onCancel} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button> : null}
      </div>
    </Panel>
  );
}
