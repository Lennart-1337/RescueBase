import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnchorButton, Tabs } from "../../components/ui";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { useMpg, useMpgAction } from "./api";
import { DeviceControls } from "./device-controls";
import { MpgDataTable } from "./data-table";
import { deviceFields, type Catalog } from "./devices";
import { Documents } from "./documents";
import { MpgForm, type FormValues } from "./form";
import { Inspections } from "./inspections";
import { MpgStatus, QueryState, textField } from "./shared";
import { Trainings } from "./trainings";
import { displayDate, type Device } from "./types";
export function DeviceDetail({ id, catalog }: { id: string; catalog: Catalog }) {
  const query = useMpg<Device>(`/devices/${encodeURIComponent(id)}`); const action = useMpgAction(); const [tab, setTab] = useState("data");
  if (!query.data) return <QueryState query={query} />;
  const device = query.data; const initial = Object.fromEntries(Object.entries(device).filter(([, value]) => typeof value === "string" || typeof value === "number")) as FormValues;
  if (device.commissionedAt) initial.commissionedAt = device.commissionedAt.slice(0, 10);
  const assignmentColumns: DataTableColumn<Device["assignments"][number]>[] = [{ id: "from", label: "Von", render: entry => displayDate(entry.startedAt), sortValue: entry => entry.startedAt, width: "130px" }, { id: "until", label: "Bis", render: entry => displayDate(entry.endedAt), sortValue: entry => entry.endedAt ?? "", width: "130px" }, { id: "location", label: "Standort", render: entry => catalog.locations.find(location => location.id === entry.locationId)?.name ?? entry.locationId, sortValue: entry => catalog.locations.find(location => location.id === entry.locationId)?.name ?? "" }, { id: "kit", label: "Rucksack", render: entry => catalog.kits.find(kit => kit.id === entry.kitId)?.name ?? "—", sortValue: entry => catalog.kits.find(kit => kit.id === entry.kitId)?.name ?? "" }, { id: "actor", label: "Verantwortlicher Benutzer", render: entry => entry.actorId, sortValue: entry => entry.actorId }];
  return <><Link to="/admin/mpg" search={{ view: "devices", device: undefined }}>Zur Geräteliste</Link><h2>{device.name} · {device.inventoryNumber}</h2><p><MpgStatus value={device.status} /> · Zubehör und Verbrauchsmaterial separat prüfen.</p>
    {device.reasons?.length ? <ul>{device.reasons.map((reason, index) => <li key={index}>{typeof reason === "string" ? reason : reason.message ?? reason.reason ?? reason.code}</li>)}</ul> : null}
    <div className="mpg-actions"><AnchorButton variant="secondary" href={`/api/mpg/exports/devices/${id}.pdf`}>Medizinproduktebuch PDF</AnchorButton><AnchorButton variant="secondary" href={`/api/mpg/exports/devices/${id}.zip`}>Vollständige Akte</AnchorButton><AnchorButton variant="ghost" href={`/api/mpg/exports/devices/${id}/label.pdf`}>QR-Etikett drucken</AnchorButton></div>
    <Tabs label="Geräteakte" value={tab} onChange={setTab} items={[{ value: "data", label: "Stammdaten" }, { value: "inspections", label: "Prüfungen" }, { value: "training", label: "Einweisungen" }, { value: "documents", label: "Dokumente" }, { value: "history", label: "Verlauf" }]} />
    {tab === "data" ? <><MpgForm key={`${id}-${device.version}`} title="Stammdaten und Zuordnung" fields={deviceFields(catalog)} initial={initial} onSubmit={(body) => action.mutateAsync({ path: `/devices/${id}`, method: "PATCH", body: { ...body, version: device.version } })} />{!device.retiredAt ? <><MpgForm title="Freigabe" fields={[]} submitLabel="Dokumentierte Freigabe prüfen und erteilen" onSubmit={() => action.mutateAsync({ path: `/devices/${id}/release`, body: { version: device.version } })} /><details className="mpg-detail"><summary>Außer Betrieb nehmen</summary><MpgForm title="Außerbetriebnahme dokumentieren" fields={[textField("reason", "Begründung")]} submitLabel="Außer Betrieb nehmen" onSubmit={(body) => action.mutateAsync({ path: `/devices/${id}/retire`, body: { ...body, version: device.version } })} /></details></> : <p>Außer Betrieb seit {displayDate(device.retiredAt)}. Die Akte bleibt erhalten.</p>}</> : null}
    {tab === "inspections" ? <><Inspections device={device} people={catalog.people} /><DeviceControls device={device} people={catalog.people} /></> : null}
    {tab === "documents" ? <Documents owner={{ deviceId: id }} /> : null}
    {tab === "training" ? <Trainings catalog={catalog} devices={[device]} trainings={device.trainings ?? []} deviceId={id} /> : null}
    {tab === "history" ? <MpgDataTable columns={assignmentColumns} emptyMessage="Noch keine Standortwechsel dokumentiert." getRowId={entry => entry.id} rows={device.assignments} /> : null}
  </>;
}
