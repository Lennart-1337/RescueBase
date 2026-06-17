import { PackageCheck, Plus, Save, X } from "lucide-react";
import { SearchableSelect } from "../../components/searchable-select";
import { InlineError } from "../../components/state-panels";
import { Button, Dialog, Field } from "../../components/ui";
import type { KitTemplate, Location } from "../../lib/types";

export function KitFormPanel(props: {
  code: string;
  error: Error | null;
  isOpen: boolean;
  isSubmitting: boolean;
  editingId: string | null;
  locationId: string;
  locations: Location[];
  name: string;
  onClose: () => void;
  onCodeChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  onTemplateChange: (value: string) => void;
  templateId: string;
  templates: KitTemplate[];
}) {
  const selectedLocationId = props.locationId || props.locations[0]?.id || "";
  const selectedTemplateId = props.templateId || props.templates[0]?.id || "";
  const canSubmit = Boolean(props.name.trim() && props.code.trim() && selectedLocationId && selectedTemplateId);

  return (
    <Dialog
      actions={<><Button disabled={props.isSubmitting} onClick={props.onClose} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button><Button disabled={!canSubmit || props.isSubmitting} onClick={props.onSubmit} type="button">{props.editingId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}{props.editingId ? "Rucksack speichern" : "Rucksack anlegen"}</Button></>}
      description={props.editingId ? "Name, Kennung, Standort und Vorlagenzuordnung lassen sich hier nachpflegen." : "Neue Rucksäcke erhalten automatisch einen geheimen QR/NFC-Link."}
      onClose={props.onClose}
      open={props.isOpen}
      title={props.editingId ? "Rucksack bearbeiten" : "Rucksack anlegen"}
    >
      <div className="form-grid form-grid-two">
        <Field label="Name"><input value={props.name} onChange={(event) => props.onNameChange(event.target.value)} /></Field>
        <Field label="Rucksackkennung"><input value={props.code} onChange={(event) => props.onCodeChange(event.target.value)} /></Field>
        <Field label="Standort"><SearchableSelect onChange={props.onLocationChange} options={props.locations.map((location) => ({ label: location.name, value: location.id }))} value={selectedLocationId} /></Field>
        <Field label="Vorlage"><SearchableSelect onChange={props.onTemplateChange} options={props.templates.map((template) => ({ label: `${template.name} v${template.version}`, value: template.id, keywords: [template.name] }))} value={selectedTemplateId} /></Field>
      </div>
      <div className="debug-hint"><PackageCheck data-icon="inline-start" /> QR/NFC-Zugang, Status und öffentlicher Token bleiben workflow-gesteuert.</div>
      {props.error ? <InlineError error={props.error} /> : null}
    </Dialog>
  );
}
