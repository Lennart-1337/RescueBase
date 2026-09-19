import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Settings2 } from "lucide-react";
import { AnchorButton, Button, Field } from "../../components/ui";
import type { UserSummary } from "../../lib/types";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { useMpgAction } from "./api";
import { MpgDataTable } from "./data-table";
import type { FormField } from "./form";
import { MpgFormDialog } from "./form-dialog";
import { dateField, MpgStatus, textField } from "./shared";
import { Models } from "./models";
import { options, statusLabel, type Device, type Model, type Named, type Person } from "./types";
export type Catalog = { locations: Named[]; kits: Named[]; users: UserSummary[]; people: Person[]; models: Model[] };
export function deviceFields(catalog: Catalog): FormField[] { return [textField("name", "Gerätename"), { name: "mpgModelId", label: "Modell", options: options(catalog.models) }, textField("inventoryNumber", "Inventarnummer", false), textField("serialNumber", "Seriennummer", false), textField("lotCode", "Loscode", false), { name: "acquisitionYear", label: "Anschaffungsjahr", type: "number", min: 1900, max: new Date().getFullYear() }, dateField("commissionedAt", "Inbetriebnahme"), { name: "locationId", label: "Standort", required: true, options: options(catalog.locations) }, { name: "kitId", label: "Rucksack", options: options(catalog.kits) }, { name: "notes", label: "Notizen", type: "textarea" }]; }
export function Devices({ devices, catalog }: { devices: Device[]; catalog: Catalog }) {
  const [showModels, setShowModels] = useState(false); const [search, setSearch] = useState(""); const [location, setLocation] = useState(""); const [kit, setKit] = useState(""); const [type, setType] = useState(""); const [status, setStatus] = useState(""); const [due, setDue] = useState(""); const [createOpen, setCreateOpen] = useState(false); const action = useMpgAction();
  const today = new Date().toISOString().slice(0, 10), inThirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const filtered = devices.filter((device) => `${device.name} ${device.inventoryNumber ?? ""} ${device.serialNumber ?? ""}`.toLocaleLowerCase("de").includes(search.toLocaleLowerCase("de")) && (!location || device.locationId === location) && (!kit || device.kitId === kit) && (!type || device.mpgModel?.productType === type) && (!status || device.status === status) && (!due || matchesDue(device, due, today, inThirtyDays)));
  const columns: DataTableColumn<Device>[] = [
    { id: "device", label: "Gerät", render: device => <><strong>{device.name}</strong><small>{device.mpgModel?.name ?? "Modell offen"}</small></>, sortValue: device => device.name },
    { id: "inventory", label: "Inventarnummer", render: device => device.inventoryNumber ?? "—", sortValue: device => device.inventoryNumber ?? "", width: "160px" },
    { id: "location", label: "Standort", render: device => device.location?.name ?? catalog.locations.find(entry => entry.id === device.locationId)?.name ?? "—", sortValue: device => device.location?.name ?? catalog.locations.find(entry => entry.id === device.locationId)?.name ?? "", width: "180px" },
    { id: "status", label: "Status", render: device => <MpgStatus value={device.status} />, sortValue: device => statusLabel(device.status), width: "140px" },
    { id: "record", label: "Geräteakte", render: device => <Link to="/admin/mpg" search={{ view: "devices", device: device.id }}>Öffnen</Link>, width: "110px" }
  ];
  if (showModels) return <Models models={catalog.models} onBack={() => setShowModels(false)} />;
  return <><section className="mpg-section"><header className="mpg-section-header"><div><h2>Geräte</h2><p>{filtered.length} von {devices.length} {devices.length === 1 ? "Gerät" : "Geräten"}</p></div><div className="mpg-section-actions"><label className="mpg-search">Suchen<input aria-label="Geräte suchen" type="search" placeholder="Name, Inventar- oder Seriennummer" value={search} onChange={(event) => setSearch(event.target.value)} /></label><Button onClick={() => setCreateOpen(true)} type="button"><Plus data-icon="inline-start" />Gerät erfassen</Button></div></header>
    <div className="mpg-actions"><Button variant="secondary" onClick={() => setShowModels(true)} type="button"><Settings2 data-icon="inline-start" />Modelle verwalten</Button><AnchorButton variant="secondary" href="/api/mpg/exports/inventory.pdf">Bestandsverzeichnis PDF</AnchorButton></div>
    <div className="mpg-fields" role="search" aria-label="Geräte filtern">{[{ label: "Standort", value: location, set: setLocation, options: options(catalog.locations) }, { label: "Rucksack", value: kit, set: setKit, options: options(catalog.kits) }, { label: "Gerätetyp", value: type, set: setType, options: [...new Set(catalog.models.map((model) => model.productType))].map((value) => ({ value, label: value })) }, { label: "Status", value: status, set: setStatus, options: ["DRAFT", "BLOCKED", "RELEASED", "RETIRED"].map((value) => ({ value, label: statusLabel(value) })) }, { label: "Prüffälligkeit", value: due, set: setDue, options: [{ value: "OVERDUE", label: "Überfällig" }, { value: "SOON", label: "In 30 Tagen" }, { value: "MISSING", label: "Fälligkeit fehlt" }] }].map((filter) => <Field key={filter.label} label={filter.label}><select value={filter.value} onChange={(event) => filter.set(event.target.value)}><option value="">Alle</option>{filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>)}</div>
    <MpgDataTable columns={columns} emptyMessage="Keine Geräte für diese Filter gefunden." getRowId={device => device.id} rows={filtered} /></section><MpgFormDialog fields={deviceFields(catalog)} intent="create" onClose={() => setCreateOpen(false)} onSubmit={(body) => action.mutateAsync({ path: "/devices", body })} open={createOpen} size="wide" submitLabel="Gerät erfassen" title="Gerät erfassen" />
  </>;
}
function matchesDue(device: Device, filter: string, today: string, inThirtyDays: string) { const due = (device.requirements ?? []).filter(r => r.mandatory).map(r => r.dueDate); if (filter === "MISSING") return due.some(value => !value); if (filter === "OVERDUE") return due.some(value => value && value < today); return due.some(value => value && value >= today && value <= inThirtyDays); }
