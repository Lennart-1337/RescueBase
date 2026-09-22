import { useState } from "react";
import { Archive, CheckCircle2, Pencil } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { AnchorButton, Button, Tabs } from "../../components/ui";
import { useMpg, useMpgAction } from "./api";
import { MpgDataTable } from "./data-table";
import { DeviceEvidence } from "./device-evidence";
import { deviceFields, type Catalog } from "./devices";
import { Documents } from "./documents";
import { type FormValues } from "./form";
import { MpgFormDialog } from "./form-dialog";
import { MpgStatus, QueryState, textField } from "./shared";
import { Trainings } from "./trainings";
import { displayDate, type Device } from "./types";

export function DeviceDetail({ id, catalog }: { id: string; catalog: Catalog }) {
  const query = useMpg<Device>(`/devices/${encodeURIComponent(id)}`); const action = useMpgAction(); const [tab, setTab] = useState("data"); const [editOpen, setEditOpen] = useState(false); const [releaseOpen, setReleaseOpen] = useState(false); const [retireOpen, setRetireOpen] = useState(false);
  if (!query.data) return <QueryState query={query} />;
  const device = query.data; const initial = Object.fromEntries(Object.entries(device).filter(([, value]) => typeof value === "string" || typeof value === "number")) as FormValues; if (device.commissionedAt) initial.commissionedAt = device.commissionedAt.slice(0, 10);
  const assignmentColumns: DataTableColumn<Device["assignments"][number]>[] = [{ id: "from", label: "Von", render: entry => displayDate(entry.startedAt), sortValue: entry => entry.startedAt, width: "130px" }, { id: "until", label: "Bis", render: entry => displayDate(entry.endedAt), sortValue: entry => entry.endedAt ?? "", width: "130px" }, { id: "location", label: "Standort", render: entry => catalog.locations.find(location => location.id === entry.locationId)?.name ?? entry.locationId, sortValue: entry => catalog.locations.find(location => location.id === entry.locationId)?.name ?? "" }, { id: "kit", label: "Rucksack", render: entry => catalog.kits.find(kit => kit.id === entry.kitId)?.name ?? "—", sortValue: entry => catalog.kits.find(kit => kit.id === entry.kitId)?.name ?? "" }, { id: "actor", label: "Dokumentiert durch", render: entry => catalog.users.find(user => user.id === entry.actorId)?.displayName ?? "Benutzerkonto", sortValue: entry => catalog.users.find(user => user.id === entry.actorId)?.displayName ?? "" }];
  const historyColumns: DataTableColumn<NonNullable<Device["history"]>[number]>[] = [{ id: "date", label: "Zeitpunkt", render: entry => new Date(entry.createdAt).toLocaleString("de-DE"), sortValue: entry => entry.createdAt, width: "180px" }, { id: "action", label: "Änderung", render: entry => historyLabel(entry.action), sortValue: entry => historyLabel(entry.action) }, { id: "actor", label: "Dokumentiert durch", render: entry => catalog.users.find(user => user.id === entry.actorId)?.displayName ?? "Benutzerkonto", sortValue: entry => catalog.users.find(user => user.id === entry.actorId)?.displayName ?? "" }];
  return <section className="mpg-device-record"><Link to="/admin/mpg" search={{ view: "devices", device: undefined }}>← Zur Geräteliste</Link><header className="mpg-record-header"><div><h2>{device.name}</h2><p>{device.inventoryNumber ?? "Ohne Inventarnummer"} · <MpgStatus value={device.status} /></p></div><div className="mpg-actions"><Button onClick={() => setEditOpen(true)} type="button" variant="secondary"><Pencil data-icon="inline-start" />Bearbeiten</Button>{!device.retiredAt && device.status !== "RELEASED" ? <Button onClick={() => setReleaseOpen(true)} type="button"><CheckCircle2 data-icon="inline-start" />Freigeben</Button> : null}</div></header>
    {device.status !== "RELEASED" && !device.retiredAt ? <p className="mpg-lock-note">Das Gerät ist organisatorisch und physisch gegen Verwendung zu sichern. Der digitale Status ersetzt keine Kennzeichnung oder Entfernung vor Ort.</p> : null}
    {device.reasons?.length ? <ul className="mpg-reasons">{device.reasons.map((reason, index) => <li key={index}>{typeof reason === "string" ? reason : reason.message ?? reason.reason ?? reason.code}</li>)}</ul> : null}
    <Tabs label="Geräteakte" value={tab} onChange={setTab} items={[{ value: "data", label: "Stammdaten" }, { value: "inspections", label: "Prüfungen" }, { value: "training", label: "Einweisungen" }, { value: "documents", label: "Dokumente" }, { value: "history", label: "Verlauf" }]} />
    {tab === "data" ? <section className="mpg-detail-section"><header><div><h3>Stammdaten und Zuordnung</h3><p>Zubehör und Verbrauchsmaterial werden separat geprüft.</p></div>{!device.retiredAt ? <Button onClick={() => setRetireOpen(true)} type="button" variant="danger"><Archive data-icon="inline-start" />Außer Betrieb</Button> : null}</header><DeviceData catalog={catalog} device={device} />{device.retiredAt ? <p>Außer Betrieb seit {displayDate(device.retiredAt)}. Die Akte bleibt erhalten.</p> : null}</section> : null}
    {tab === "inspections" ? <DeviceEvidence device={device} people={catalog.people} /> : null}
    {tab === "documents" ? <><div aria-label="Geräteakte ausgeben" className="mpg-actions"><AnchorButton variant="secondary" href={`/api/mpg/exports/devices/${id}.pdf`}>Medizinproduktebuch PDF</AnchorButton><AnchorButton variant="secondary" href={`/api/mpg/exports/devices/${id}.zip`}>Vollständige Akte</AnchorButton><AnchorButton variant="ghost" href={`/api/mpg/exports/devices/${id}/label.pdf`}>QR-Etikett</AnchorButton></div><Documents owner={{ deviceId: id }} /></> : null}
    {tab === "training" ? <Trainings catalog={catalog} trainings={device.trainings ?? []} modelId={device.mpgModelId} /> : null}
    {tab === "history" ? <><section className="mpg-detail-section"><h3>Standortverlauf</h3><MpgDataTable columns={assignmentColumns} emptyMessage="Noch keine Standortwechsel dokumentiert." getRowId={entry => entry.id} rows={device.assignments} /></section><section className="mpg-detail-section"><h3>Änderungsverlauf</h3><MpgDataTable columns={historyColumns} emptyMessage="Noch keine Änderungen dokumentiert." getRowId={entry => entry.id} rows={device.history ?? []} /></section></> : null}
    <MpgFormDialog fields={deviceFields(catalog)} initial={initial} onClose={() => setEditOpen(false)} onSubmit={body => action.mutateAsync({ path: `/devices/${id}`, method: "PATCH", body: { ...body, version: device.version } })} open={editOpen} size="wide" submitLabel="Änderungen speichern" title="Gerät bearbeiten" />
    <MpgFormDialog description="Die Freigabe wird nur erteilt, wenn alle dokumentierten Voraussetzungen erfüllt sind." fields={[]} onClose={() => setReleaseOpen(false)} onSubmit={() => action.mutateAsync({ path: `/devices/${id}/release`, body: { version: device.version } })} open={releaseOpen} submitLabel="Freigabe erteilen" title="Gerät freigeben" />
    <MpgFormDialog fields={[textField("reason", "Begründung")]} onClose={() => setRetireOpen(false)} onSubmit={body => action.mutateAsync({ path: `/devices/${id}/retire`, body: { ...body, version: device.version } })} open={retireOpen} submitLabel="Außerbetriebnahme dokumentieren" title="Gerät außer Betrieb nehmen" />
  </section>;
}

function historyLabel(action: string) {
  return ({ MPG_DEVICE_CREATED: "Gerät angelegt", MPG_DEVICE_UPDATED: "Stammdaten geändert", MPG_RELEASED: "Freigabe dokumentiert", MPG_RETIRED: "Außerbetriebnahme dokumentiert", MPG_INSPECTION_DRAFT: "Prüfnachweis bearbeitet", MPG_INSPECTION_FINALIZED: "Prüfnachweis abgeschlossen", MPG_INCIDENT_CREATED: "Vorkommnis erfasst", MPG_INCIDENT_UPDATED: "Vorkommnis bearbeitet", MPG_GLUCOSE_CONTROL_FINALIZED: "BZ-Kontrolle dokumentiert", MPG_GLUCOSE_CONTROL_RESOLVED: "BZ-Kontrolle geklärt" } as Record<string, string>)[action] ?? action;
}

function DeviceData({ catalog, device }: { catalog: Catalog; device: Device }) {
  const values = [["Modell", device.mpgModel?.name ?? "Offen"], ["Seriennummer", device.serialNumber ?? "—"], ["Loscode", device.lotCode ?? "—"], ["Anschaffungsjahr", device.acquisitionYear ?? "—"], ["Inbetriebnahme", displayDate(device.commissionedAt)], ["Standort", device.location?.name ?? catalog.locations.find(entry => entry.id === device.locationId)?.name ?? "—"], ["Rucksack", device.kit?.name ?? catalog.kits.find(entry => entry.id === device.kitId)?.name ?? "—"]];
  return <dl className="mpg-definition">{values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
