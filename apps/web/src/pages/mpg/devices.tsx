import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AnchorButton, Button } from "../../components/ui";
import { PageToolbar } from "../../components/page-layout";
import type { UserSummary } from "../../lib/types";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { useMpgAction } from "./api";
import { MpgDataTable } from "./data-table";
import { DeviceFilterToolbar, emptyDeviceFilters } from "./device-filter-toolbar";
import type { FormField } from "./form";
import { MpgFormDialog } from "./form-dialog";
import { dateField, MpgStatus, textField } from "./shared";
import { options, statusLabel, type Device, type Model, type Named, type Person } from "./types";
export type Catalog = { locations: Named[]; kits: Named[]; users: UserSummary[]; people: Person[]; models: Model[] };
export function deviceFields(catalog: Catalog): FormField[] { return [
  { ...textField("name", "Gerätename"), group: "Gerät" },
  { name: "mpgModelId", label: "Modell", options: options(catalog.models), group: "Gerät" },
  { ...textField("inventoryNumber", "Inventarnummer", false), group: "Kennzeichnung" },
  { ...textField("serialNumber", "Seriennummer", false), group: "Kennzeichnung" },
  { ...textField("lotCode", "Loscode", false), group: "Kennzeichnung" },
  { name: "acquisitionYear", label: "Anschaffungsjahr", type: "number", min: 1900, max: new Date().getFullYear(), group: "Kennzeichnung" },
  { ...dateField("commissionedAt", "Inbetriebnahme"), group: "Kennzeichnung" },
  { name: "locationId", label: "Standort", required: true, options: options(catalog.locations), group: "Zuordnung" },
  { name: "kitId", label: "Rucksack", options: options(catalog.kits), group: "Zuordnung" },
  { name: "notes", label: "Notizen", type: "textarea", group: "Zuordnung" }
]; }
export function Devices({ devices, catalog }: { devices: Device[]; catalog: Catalog }) {
  const [filters, setFilters] = useState(emptyDeviceFilters); const [createOpen, setCreateOpen] = useState(false); const action = useMpgAction();
  const today = new Date().toISOString().slice(0, 10), inThirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const filtered = devices.filter((device) => `${device.name} ${device.inventoryNumber ?? ""} ${device.serialNumber ?? ""}`.toLocaleLowerCase("de").includes(filters.search.toLocaleLowerCase("de")) && (!filters.location || device.locationId === filters.location) && (!filters.kit || device.kitId === filters.kit) && (!filters.type || device.mpgModel?.productType === filters.type) && (!filters.status || device.status === filters.status) && (!filters.due || matchesDue(device, filters.due, today, inThirtyDays)));
  const columns: DataTableColumn<Device>[] = [
    { id: "device", label: "Gerät", render: device => <><strong>{device.name}</strong><small>{device.mpgModel?.name ?? "Modell offen"}</small></>, sortValue: device => device.name },
    { id: "inventory", label: "Inventarnummer", render: device => device.inventoryNumber ?? "—", sortValue: device => device.inventoryNumber ?? "", width: "160px" },
    { id: "location", label: "Standort", render: device => device.location?.name ?? catalog.locations.find(entry => entry.id === device.locationId)?.name ?? "—", sortValue: device => device.location?.name ?? catalog.locations.find(entry => entry.id === device.locationId)?.name ?? "", width: "180px" },
    { id: "status", label: "Status", render: device => <MpgStatus value={device.status} />, sortValue: device => statusLabel(device.status), width: "140px" },
    { id: "record", label: "Geräteakte", render: device => <Link to="/admin/mpg" search={{ view: "devices", device: device.id }}>Öffnen</Link>, width: "110px" }
  ];
  return <><section className="mpg-section"><header className="mpg-section-header"><div><h2>Geräte</h2><p>{devices.length} {devices.length === 1 ? "Gerät" : "Geräte"}</p></div><div className="mpg-section-actions"><AnchorButton variant="secondary" href="/api/mpg/exports/inventory.pdf">Bestandsverzeichnis PDF</AnchorButton><Button onClick={() => setCreateOpen(true)} type="button"><Plus data-icon="inline-start" />Gerät erfassen</Button></div></header>
    <PageToolbar label="Geräte filtern"><DeviceFilterToolbar catalog={catalog} count={filtered.length} filters={filters} onChange={patch => setFilters(current => ({ ...current, ...patch }))} onReset={() => setFilters(emptyDeviceFilters)} total={devices.length} /></PageToolbar>
    <MpgDataTable columns={columns} emptyMessage="Keine Geräte für diese Filter gefunden." getRowId={device => device.id} rows={filtered} /></section><MpgFormDialog fields={deviceFields(catalog)} intent="create" onClose={() => setCreateOpen(false)} onSubmit={(body) => action.mutateAsync({ path: "/devices", body })} open={createOpen} size="wide" submitLabel="Gerät erfassen" title="Gerät erfassen" />
  </>;
}
function matchesDue(device: Device, filter: string, today: string, inThirtyDays: string) { const due = (device.requirements ?? []).filter(r => r.mandatory).map(r => r.dueDate); if (filter === "MISSING") return due.some(value => !value); if (filter === "OVERDUE") return due.some(value => value && value < today); return due.some(value => value && value >= today && value <= inThirtyDays); }
