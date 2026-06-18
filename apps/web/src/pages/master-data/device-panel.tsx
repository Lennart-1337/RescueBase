import { useState } from "react";
import { Pencil, Plus, Save, X } from "lucide-react";
import { ListFilterBar } from "../../components/list-filter-bar";
import { PageToolbar } from "../../components/page-layout";
import { SearchableSelect } from "../../components/searchable-select";
import { InlineError } from "../../components/state-panels";
import { Badge, Button, Dialog, Field, Panel } from "../../components/ui";
import type { Article, Location } from "../../lib/types";
import type { MedicalDevice, MedicalDeviceWriteBody } from "../../lib/extra-api";

type Draft = MedicalDeviceWriteBody & { isOpen: boolean; editingId: string | null; active: boolean };

export function DevicePanel(props: {
  articles: Article[];
  error: Error | null;
  filters: {
    active: string;
    articleId: string;
    locationId: string;
    q: string;
  };
  isSubmitting: boolean;
  locations: Location[];
  devices: MedicalDevice[];
  onFilterChange: (patch: Partial<{ active: string; articleId: string; locationId: string; q: string }>) => void;
  onResetFilters: () => void;
  onCreate: (body: MedicalDeviceWriteBody) => Promise<unknown>;
  onSave: (id: string, body: MedicalDeviceWriteBody) => Promise<unknown>;
  totalCount: number;
}) {
  const [draft, setDraft] = useState(emptyDraft(props.articles[0]?.id ?? "", props.locations[0]?.id ?? ""));

  function openForCreate() {
    setDraft(emptyDraft(props.articles[0]?.id ?? "", props.locations[0]?.id ?? ""));
    setDraft((current) => ({ ...current, isOpen: true }));
  }

  function openForEdit(device: MedicalDevice) {
    setDraft({
      isOpen: true,
      editingId: device.id,
      name: device.name,
      articleId: device.articleId,
      locationId: device.locationId,
      serialNumber: device.serialNumber ?? "",
      inventoryNumber: device.inventoryNumber ?? "",
      lastStkAt: device.lastStkAt?.slice(0, 10) ?? "",
      lastMtkAt: device.lastMtkAt?.slice(0, 10) ?? "",
      stkIntervalMonths: device.stkIntervalMonths,
      mtkIntervalMonths: device.mtkIntervalMonths,
      active: device.active,
      notes: device.notes ?? ""
    });
  }

  const canSubmit = Boolean(draft.name.trim() && draft.articleId && draft.locationId);

  async function submit() {
    if (!canSubmit) return;
    const body: MedicalDeviceWriteBody = {
      name: draft.name,
      articleId: draft.articleId,
      locationId: draft.locationId,
      serialNumber: optionalText(draft.serialNumber),
      inventoryNumber: optionalText(draft.inventoryNumber),
      lastStkAt: optionalText(draft.lastStkAt),
      lastMtkAt: optionalText(draft.lastMtkAt),
      stkIntervalMonths: draft.stkIntervalMonths ?? null,
      mtkIntervalMonths: draft.mtkIntervalMonths ?? null,
      active: draft.active,
      notes: optionalText(draft.notes)
    };
    const succeeded = await (draft.editingId ? props.onSave(draft.editingId, body) : props.onCreate(body)).then(() => true).catch(() => false);
    if (succeeded) setDraft(emptyDraft(props.articles[0]?.id ?? "", props.locations[0]?.id ?? ""));
  }

  return (
    <>
      <PageToolbar label="Geräte filtern"><ListFilterBar countLabel={`${props.devices.length}/${props.totalCount} sichtbar`} onReset={props.onResetFilters}>
        <Field label="Suche"><input onChange={(event) => props.onFilterChange({ q: event.target.value })} placeholder="Name, Serien- oder Inventarnummer" value={props.filters.q} /></Field>
        <Field label="Standort"><SearchableSelect emptyLabel="Alle Standorte" onChange={(value) => props.onFilterChange({ locationId: value })} options={[{ label: "Alle Standorte", value: "" }, ...props.locations.map((location) => ({ label: location.name, value: location.id }))]} value={props.filters.locationId} /></Field>
        <Field label="Artikel"><SearchableSelect emptyLabel="Alle Artikel" onChange={(value) => props.onFilterChange({ articleId: value })} options={[{ label: "Alle Artikel", value: "" }, ...props.articles.map((article) => ({ label: article.name, value: article.id }))]} value={props.filters.articleId} /></Field>
        <Field label="Status"><select onChange={(event) => props.onFilterChange({ active: event.target.value })} value={props.filters.active}><option value="">Alle Status</option><option value="active">Aktiv</option><option value="inactive">Inaktiv</option></select></Field>
      </ListFilterBar></PageToolbar>
      <Panel>
      <div className="panel-header">
        <div><h2>Geräte</h2><p>Medizinische Geräte mit STK- und MTK-Daten.</p></div>
        <Button onClick={openForCreate} type="button"><Plus data-icon="inline-start" />Gerät hinzufügen</Button>
      </div>
      {props.devices.length === 0 ? <div className="compact-list-empty">Noch keine Geräte angelegt.</div> : null}
      <div className="compact-list">
        {props.devices.map((device) => (
          <div className="compact-list-row compact-list-row-actions" key={device.id}>
            <span>
              <strong>{device.name}</strong>
              <small>{device.location.name} · {device.article.name}</small>
            </span>
            <div className="row-actions">
              {device.article.stkRequired ? <Badge tone="info">STK</Badge> : null}
              {device.article.mtkRequired ? <Badge tone="info">MTK</Badge> : null}
              {device.active ? <Badge tone="ready">aktiv</Badge> : <Badge tone="warning">inaktiv</Badge>}
              <Button onClick={() => openForEdit(device)} type="button" variant="ghost"><Pencil data-icon="inline-start" />Bearbeiten</Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog
        actions={<><Button disabled={props.isSubmitting} onClick={() => setDraft(emptyDraft(props.articles[0]?.id ?? "", props.locations[0]?.id ?? ""))} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button><Button disabled={!canSubmit || props.isSubmitting} onClick={() => void submit()} type="button"><Save data-icon="inline-start" />{draft.editingId ? "Gerät speichern" : "Gerät anlegen"}</Button></>}
        description="Pflegen Sie Geräte mit individuellen Kontrollterminen und Standortzuordnung."
        onClose={() => setDraft(emptyDraft(props.articles[0]?.id ?? "", props.locations[0]?.id ?? ""))}
        open={draft.isOpen}
        title={draft.editingId ? "Gerät bearbeiten" : "Gerät anlegen"}
      >
        <div className="form-grid form-grid-three">
          <Field label="Name"><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="Artikel"><SearchableSelect onChange={(value) => setDraft((current) => ({ ...current, articleId: value }))} options={props.articles.map((article) => ({ label: article.name, value: article.id }))} value={draft.articleId} /></Field>
          <Field label="Lagerort"><SearchableSelect onChange={(value) => setDraft((current) => ({ ...current, locationId: value }))} options={props.locations.map((location) => ({ label: location.name, value: location.id }))} value={draft.locationId} /></Field>
          <Field label="Seriennummer"><input value={draft.serialNumber ?? ""} onChange={(event) => setDraft((current) => ({ ...current, serialNumber: event.target.value }))} /></Field>
          <Field label="Inventarnummer"><input value={draft.inventoryNumber ?? ""} onChange={(event) => setDraft((current) => ({ ...current, inventoryNumber: event.target.value }))} /></Field>
          <Field label="Last STK"><input type="date" value={draft.lastStkAt ?? ""} onChange={(event) => setDraft((current) => ({ ...current, lastStkAt: event.target.value }))} /></Field>
          <Field label="STK-Intervall"><input inputMode="numeric" min="1" type="number" value={draft.stkIntervalMonths ?? ""} onChange={(event) => setDraft((current) => ({ ...current, stkIntervalMonths: parseOptionalInt(event.target.value) }))} /></Field>
          <Field label="Last MTK"><input type="date" value={draft.lastMtkAt ?? ""} onChange={(event) => setDraft((current) => ({ ...current, lastMtkAt: event.target.value }))} /></Field>
          <Field label="MTK-Intervall"><input inputMode="numeric" min="1" type="number" value={draft.mtkIntervalMonths ?? ""} onChange={(event) => setDraft((current) => ({ ...current, mtkIntervalMonths: parseOptionalInt(event.target.value) }))} /></Field>
          <label className="check-field"><input checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} type="checkbox" /><span>Aktiv</span></label>
          <Field label="Hinweise"><textarea rows={3} value={draft.notes ?? ""} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} /></Field>
        </div>
        {props.error ? <InlineError error={props.error} /> : null}
      </Dialog>
      </Panel>
    </>
  );
}

function emptyDraft(articleId: string, locationId: string): Draft {
  return {
    isOpen: false,
    editingId: null,
    name: "",
    articleId,
    locationId,
    serialNumber: "",
    inventoryNumber: "",
    lastStkAt: "",
    lastMtkAt: "",
    stkIntervalMonths: null,
    mtkIntervalMonths: null,
    active: true,
    notes: ""
  };
}

function optionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function parseOptionalInt(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
