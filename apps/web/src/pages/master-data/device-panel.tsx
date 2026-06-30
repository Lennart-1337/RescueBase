import { useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { ListFilterBar } from "../../components/list-filter-bar";
import { PanelHeader } from "../../components/panel-header";
import { PageToolbar } from "../../components/page-layout";
import { SearchableSelect } from "../../components/searchable-select";
import { InlineError } from "../../components/state-panels";
import { Button, Dialog, Field, Panel } from "../../components/ui";
import type { Article, Kit, Location } from "../../lib/types";
import type { MedicalDevice, MedicalDeviceWriteBody } from "../../lib/extra-api";
import { DeviceListRow } from "./device-list-row";
import { buildDeviceLocationFilterOptions, buildDeviceStorageOptions, decodeDeviceStorage, selectedDeviceStorageValue } from "./device-storage";

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
  kits: Kit[];
  locations: Location[];
  devices: MedicalDevice[];
  onFilterChange: (patch: Partial<{ active: string; articleId: string; locationId: string; q: string }>) => void;
  onResetFilters: () => void;
  onCreate: (body: MedicalDeviceWriteBody) => Promise<unknown>;
  onDelete: (id: string) => void;
  onSave: (id: string, body: MedicalDeviceWriteBody) => Promise<unknown>;
  totalCount: number;
}) {
  const [draft, setDraft] = useState(emptyDraft(props.articles[0]?.id ?? "", props.locations[0]?.id ?? ""));
  const canSubmit = Boolean(draft.name.trim() && draft.articleId && (draft.kitId || draft.locationId));
  const locationFilterOptions = buildDeviceLocationFilterOptions(props.locations, props.kits);
  const statusOptions = [{ label: "Alle Status", value: "" }, { label: "Aktiv", value: "active" }, { label: "Inaktiv", value: "inactive" }];
  const storageOptions = buildDeviceStorageOptions(props.locations, props.kits);

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
      kitId: device.kitId ?? undefined,
      locationId: device.kitId ? undefined : device.locationId,
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

  async function submit() {
    if (!canSubmit) return;
    const body: MedicalDeviceWriteBody = {
      name: draft.name,
      articleId: draft.articleId,
      locationId: draft.locationId,
      kitId: draft.kitId,
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

  function confirmDelete(device: MedicalDevice) {
    if (window.confirm(`Gerät "${device.name}" wirklich löschen?`)) {
      props.onDelete(device.id);
    }
  }

  return (
    <>
      <PageToolbar label="Geräte filtern"><ListFilterBar countLabel={`${props.devices.length}/${props.totalCount} sichtbar`} onReset={props.onResetFilters}>
        <Field label="Suche"><input onChange={(event) => props.onFilterChange({ q: event.target.value })} placeholder="Name, Serien- oder Inventarnummer" value={props.filters.q} /></Field>
        <Field label="Standort"><SearchableSelect emptyLabel="Alle Standorte" onChange={(value) => props.onFilterChange({ locationId: value })} options={[{ label: "Alle Standorte", value: "" }, ...locationFilterOptions]} value={props.filters.locationId} /></Field>
        <Field label="Artikel"><SearchableSelect emptyLabel="Alle Artikel" onChange={(value) => props.onFilterChange({ articleId: value })} options={[{ label: "Alle Artikel", value: "" }, ...props.articles.map((article) => ({ label: article.name, value: article.id }))]} value={props.filters.articleId} /></Field>
        <Field label="Status"><SearchableSelect emptyLabel="Alle Status" onChange={(value) => props.onFilterChange({ active: value })} options={statusOptions} value={props.filters.active} /></Field>
      </ListFilterBar></PageToolbar>
      <Panel>
      <PanelHeader title="Geräte" actions={<Button onClick={openForCreate} type="button"><Plus data-icon="inline-start" />Gerät hinzufügen</Button>} />
      {props.devices.length === 0 ? <div className="compact-list-empty">Noch keine Geräte angelegt.</div> : null}
      <div className="compact-list">
        {props.devices.map((device) => (
          <DeviceListRow
            device={device}
            isSubmitting={props.isSubmitting}
            key={device.id}
            onDelete={() => confirmDelete(device)}
            onEdit={() => openForEdit(device)}
          />
        ))}
      </div>
      <Dialog
        actions={<><Button disabled={props.isSubmitting} onClick={() => setDraft(emptyDraft(props.articles[0]?.id ?? "", props.locations[0]?.id ?? ""))} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button><Button disabled={!canSubmit || props.isSubmitting} onClick={() => void submit()} type="button"><Save data-icon="inline-start" />{draft.editingId ? "Gerät speichern" : "Gerät anlegen"}</Button></>}
        onClose={() => setDraft(emptyDraft(props.articles[0]?.id ?? "", props.locations[0]?.id ?? ""))}
        open={draft.isOpen}
        title={draft.editingId ? "Gerät bearbeiten" : "Gerät anlegen"}
      >
        <div className="form-grid form-grid-three">
          <Field label="Name"><input autoFocus value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="Artikel"><SearchableSelect onChange={(value) => setDraft((current) => ({ ...current, articleId: value }))} options={props.articles.map((article) => ({ label: article.name, value: article.id }))} value={draft.articleId} /></Field>
          <Field label="Lagerort"><SearchableSelect onChange={(value) => setDraft((current) => ({ ...current, ...decodeDeviceStorage(value) }))} options={storageOptions} value={selectedDeviceStorageValue(draft)} /></Field>
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
