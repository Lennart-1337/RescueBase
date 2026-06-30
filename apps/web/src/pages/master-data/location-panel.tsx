import { useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { locationKindLabel } from "../../app/formatters";
import { ListRow, RowActions } from "../../components/list-row";
import { PanelHeader } from "../../components/panel-header";
import { SearchableSelect } from "../../components/searchable-select";
import { InlineError } from "../../components/state-panels";
import { Button, Dialog, Field, Panel } from "../../components/ui";
import type { CreateLocationRequest, Location, UpdateLocationRequest } from "../../lib/types";

export function LocationPanel(props: {
  error: Error | null;
  isSubmitting: boolean;
  locations: Location[];
  onCreate: (body: CreateLocationRequest) => Promise<unknown>;
  onDelete: (id: string) => void;
  onSave: (id: string, body: UpdateLocationRequest) => Promise<unknown>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("STORAGE");
  const canSubmit = Boolean(name.trim() && kind);

  function openForCreate() {
    setEditingId(null);
    setName("");
    setKind("STORAGE");
    setIsOpen(true);
  }

  function openForEdit(location: Location) {
    setEditingId(location.id);
    setName(location.name);
    setKind(location.kind);
    setIsOpen(true);
  }

  async function submit() {
    if (!canSubmit) return;
    const succeeded = await (editingId ? props.onSave(editingId, { kind, name }) : props.onCreate({ kind, name })).then(() => true).catch(() => false);
    if (succeeded) {
      setIsOpen(false);
    }
  }

  function confirmDelete(location: Location) {
    if (window.confirm(`Lagerort "${location.name}" wirklich löschen?`)) {
      props.onDelete(location.id);
    }
  }

  return (
    <Panel>
      <PanelHeader title="Lagerorte" actions={<Button onClick={openForCreate} type="button"><Plus data-icon="inline-start" />Lagerort hinzufügen</Button>} />
      {props.locations.length === 0 ? <div className="compact-list-empty">Noch keine Lagerorte angelegt.</div> : null}
      <div className="compact-list">
        {props.locations.map((location) => (
          <ListRow key={location.id} title={location.name} meta={locationKindLabel(location.kind)} actions={(
            <RowActions>
              <Button onClick={() => openForEdit(location)} type="button" variant="ghost"><Pencil data-icon="inline-start" />Bearbeiten</Button>
              <Button aria-label={`${location.name} löschen`} disabled={props.isSubmitting} onClick={() => confirmDelete(location)} type="button" variant="danger"><Trash2 data-icon="inline-start" />Löschen</Button>
            </RowActions>
          )} />
        ))}
      </div>
      <Dialog actions={<><Button disabled={props.isSubmitting} onClick={() => setIsOpen(false)} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button><Button disabled={!canSubmit || props.isSubmitting} onClick={() => void submit()} type="button">{editingId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}{editingId ? "Lagerort speichern" : "Lagerort anlegen"}</Button></>} onClose={() => setIsOpen(false)} open={isOpen} title={editingId ? "Lagerort bearbeiten" : "Lagerort anlegen"}>
        <div className="form-grid form-grid-two">
          <Field label="Name"><input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="Typ"><SearchableSelect onChange={setKind} options={[{ label: "Lager", value: "STORAGE" }, { label: "Fahrzeug", value: "VEHICLE" }, { label: "Raum", value: "ROOM" }]} value={kind} /></Field>
        </div>
        {props.error ? <InlineError error={props.error} /> : null}
      </Dialog>
    </Panel>
  );
}
