import { useState } from "react";
import { Pencil, Plus, Undo2 } from "lucide-react";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { Button } from "../../components/ui";
import { useMpgAction } from "./api";
import { MpgDataTable } from "./data-table";
import { MpgFormDialog } from "./form-dialog";
import { dateField, MpgStatus, textField } from "./shared";
import { displayDate, options, statusLabel, type Cylinder, type Named } from "./types";

const cylinderStatuses = ["FULL", "IN_USE", "EMPTY", "RETURNED"];
function cylinderFields(locations: Named[]) { return [textField("cylinderNumber", "Flaschennummer"), { name: "sizeLiters", label: "Größe in Litern", type: "number" as const, required: true, min: 0.01 }, { name: "locationId", label: "Standort", required: true, options: options(locations) }, { name: "status", label: "Status", required: true, options: cylinderStatuses.map(value => ({ value, label: statusLabel(value) })) }, dateField("inspectedAt", "Geprüft am", true), dateField("inspectionDueAt", "Prüfung fällig", true), dateField("expiresAt", "Verfall", true)]; }

export function Cylinders({ cylinders, locations }: { cylinders: Cylinder[]; locations: Named[] }) {
  const action = useMpgAction();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Cylinder | null>(null);
  const [returning, setReturning] = useState<Cylinder | null>(null);
  const columns: DataTableColumn<Cylinder>[] = [
    { id: "number", label: "Flaschennummer", render: cylinder => <strong>{cylinder.cylinderNumber}</strong>, sortValue: cylinder => cylinder.cylinderNumber },
    { id: "size", label: "Größe", render: cylinder => `${cylinder.sizeLiters} l`, sortValue: cylinder => cylinder.sizeLiters, width: "90px" },
    { id: "location", label: "Standort", render: cylinder => cylinder.location?.name ?? locations.find(location => location.id === cylinder.locationId)?.name ?? "—", sortValue: cylinder => cylinder.location?.name ?? "", width: "160px" },
    { id: "status", label: "Status", render: cylinder => <MpgStatus value={cylinder.status} />, sortValue: cylinder => statusLabel(cylinder.status), width: "140px" },
    { id: "deadlines", label: "Fristen", render: cylinder => <><span>Prüfung {displayDate(cylinder.inspectionDueAt)}</span><small>Verfall {displayDate(cylinder.expiresAt)}</small></>, sortValue: cylinder => cylinder.inspectionDueAt, width: "180px" },
    { id: "actions", label: "Aktionen", render: cylinder => cylinder.status === "RETURNED" ? "Abgeschlossen" : <div className="mpg-row-actions"><Button onClick={() => setEditing(cylinder)} type="button" variant="secondary"><Pencil data-icon="inline-start" />Bearbeiten</Button><Button onClick={() => setReturning(cylinder)} type="button" variant="ghost"><Undo2 data-icon="inline-start" />Rückgabe</Button></div>, width: "230px" }
  ];
  const fields = cylinderFields(locations);
  return <section className="mpg-section"><header className="mpg-section-header"><div><h2>Sauerstoffflaschen</h2><p>{cylinders.length} dokumentierte Tauschflaschen</p></div><Button onClick={() => setCreateOpen(true)} type="button"><Plus data-icon="inline-start" />Tauschflasche erfassen</Button></header><p>Tauschflaschen werden mit eigener Identität geführt. Druckminderer bleiben eigenständige MPG-Geräte.</p>
    <MpgDataTable columns={columns} emptyMessage="Noch keine Sauerstoffflaschen erfasst." getRowId={cylinder => cylinder.id} rows={cylinders} />
    <MpgFormDialog fields={fields} initial={{ status: "FULL" }} intent="create" onClose={() => setCreateOpen(false)} onSubmit={body => action.mutateAsync({ path: "/cylinders", body })} open={createOpen} size="wide" submitLabel="Tauschflasche erfassen" title="Tauschflasche erfassen" />
    {editing ? <MpgFormDialog fields={fields} initial={{ cylinderNumber: editing.cylinderNumber, sizeLiters: editing.sizeLiters, locationId: editing.locationId, status: editing.status, inspectedAt: editing.inspectedAt.slice(0, 10), inspectionDueAt: editing.inspectionDueAt.slice(0, 10), expiresAt: editing.expiresAt.slice(0, 10) }} onClose={() => setEditing(null)} onSubmit={body => action.mutateAsync({ path: `/cylinders/${editing.id}`, method: "PATCH", body: { ...body, version: editing.version } })} open size="wide" submitLabel="Änderungen speichern" title="Tauschflasche bearbeiten" /> : null}
    {returning ? <MpgFormDialog description="Die Flasche wird als zurückgegeben dokumentiert. Nummer und Historie bleiben erhalten." fields={[]} onClose={() => setReturning(null)} onSubmit={() => action.mutateAsync({ path: `/cylinders/${returning.id}/return`, body: { version: returning.version } })} open submitLabel="Rückgabe dokumentieren" title={`${returning.cylinderNumber} zurückgeben`} /> : null}
  </section>;
}
