import type { DataTableColumn } from "../../components/data-table/data-table";
import { useMpgAction } from "./api";
import { MpgDataTable } from "./data-table";
import { MpgForm } from "./form";
import { dateField, MpgStatus, textField } from "./shared";
import { displayDate, options, statusLabel, type Cylinder, type Device, type Named } from "./types";

export function Cylinders({ cylinders, locations, devices }: { cylinders: Cylinder[]; locations: Named[]; devices: Device[] }) {
  const action = useMpgAction(); const reducers = devices.filter(d => /druckminderer/i.test(`${d.mpgModel?.productType ?? ""} ${d.mpgModel?.name ?? ""}`) && !d.retiredAt);
  const columns: DataTableColumn<Cylinder>[] = [{ id: "number", label: "Flaschennummer", render: cylinder => <strong>{cylinder.cylinderNumber}</strong>, sortValue: cylinder => cylinder.cylinderNumber }, { id: "supplier", label: "Lieferant", render: cylinder => cylinder.supplier, sortValue: cylinder => cylinder.supplier }, { id: "size", label: "Größe", render: cylinder => `${cylinder.sizeLiters} l`, sortValue: cylinder => cylinder.sizeLiters, width: "90px" }, { id: "location", label: "Standort", render: cylinder => locations.find(location => location.id === cylinder.locationId)?.name ?? cylinder.locationId, sortValue: cylinder => locations.find(location => location.id === cylinder.locationId)?.name ?? "", width: "160px" }, { id: "status", label: "Status", render: cylinder => <MpgStatus value={cylinder.status} />, sortValue: cylinder => statusLabel(cylinder.status), width: "140px" }, { id: "deadlines", label: "Fristen", render: cylinder => <><span>Prüfung {displayDate(cylinder.inspectionDueAt)}</span><small>Verfall {displayDate(cylinder.expiresAt)}</small></>, sortValue: cylinder => cylinder.inspectionDueAt ?? cylinder.expiresAt ?? "", width: "180px" }];
  return <section className="mpg-section"><header className="mpg-section-header"><div><h2>Sauerstoffflaschen</h2><p>{cylinders.length} dokumentierte Tauschflaschen</p></div></header><p>Tauschflaschen werden getrennt von medizinischem Sauerstoff und eigenen Druckminderern dokumentiert.</p>
    <MpgDataTable columns={columns} emptyMessage="Noch keine Sauerstoffflaschen erfasst." getRowId={cylinder => cylinder.id} rows={cylinders} />
    {cylinders.filter(c => c.status !== "RETURNED").map(c => <details key={c.id} className="mpg-detail"><summary>{c.cylinderNumber} verwalten</summary>
      <MpgForm title="Druckminderer zuordnen" initial={{ version: c.version }} fields={[{ name: "deviceId", label: "Druckminderer", required: true, options: options(reducers) }]} onSubmit={body => action.mutateAsync({ path: `/cylinders/${c.id}/assign`, body: { ...body, version: c.version } })} />
      <MpgForm title="Flasche zurückgeben" fields={[]} submitLabel="Rückgabe dokumentieren" onSubmit={() => action.mutateAsync({ path: `/cylinders/${c.id}/return`, body: { version: c.version } })} />
    </details>)}
    <details className="mpg-detail"><summary>Tauschflasche erfassen</summary><MpgForm title="Neue Sauerstoffflasche" initial={{ status: "FULL" }} fields={[textField("supplier", "Lieferant"), textField("cylinderNumber", "Flaschennummer"), { name: "sizeLiters", label: "Größe in Litern", type: "number", required: true, min: 0 }, { name: "locationId", label: "Standort", required: true, options: options(locations) }, { name: "status", label: "Status", required: true, options: ["FULL", "IN_USE", "EMPTY", "RETURNED"].map(value => ({ value, label: statusLabel(value) })) }, dateField("inspectedAt", "Geprüft am"), dateField("inspectionDueAt", "Prüfung fällig"), dateField("expiresAt", "Verfall")]} onSubmit={body => action.mutateAsync({ path: "/cylinders", body })} /></details>
  </section>;
}
