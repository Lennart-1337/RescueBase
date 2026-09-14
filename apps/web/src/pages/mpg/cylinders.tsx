import { useMpgAction } from "./api";
import { MpgForm } from "./form";
import { dateField, MpgTable, textField } from "./shared";
import { displayDate, options, statusLabel, type Cylinder, type Device, type Named } from "./types";

export function Cylinders({ cylinders, locations, devices }: { cylinders: Cylinder[]; locations: Named[]; devices: Device[] }) {
  const action = useMpgAction(); const reducers = devices.filter(d => /druckminderer/i.test(`${d.mpgModel?.productType ?? ""} ${d.mpgModel?.name ?? ""}`) && !d.retiredAt);
  return <section><h2>Sauerstoffflaschen</h2><p>Tauschflaschen werden getrennt von medizinischem Sauerstoff und eigenen Druckminderern dokumentiert.</p>
    <MpgTable headings={["Flaschennummer", "Lieferant", "Größe", "Standort", "Status", "Fristen"]} empty={!cylinders.length}>{cylinders.map(c => <tr key={c.id}><td>{c.cylinderNumber}</td><td>{c.supplier}</td><td>{c.sizeLiters} l</td><td>{locations.find(l => l.id === c.locationId)?.name ?? c.locationId}</td><td>{statusLabel(c.status)}</td><td>Prüfung {displayDate(c.inspectionDueAt)}<br />Verfall {displayDate(c.expiresAt)}</td></tr>)}</MpgTable>
    {cylinders.filter(c => c.status !== "RETURNED").map(c => <details key={c.id} className="mpg-detail"><summary>{c.cylinderNumber} verwalten</summary>
      <MpgForm title="Druckminderer zuordnen" initial={{ version: c.version }} fields={[{ name: "deviceId", label: "Druckminderer", required: true, options: options(reducers) }]} onSubmit={body => action.mutateAsync({ path: `/cylinders/${c.id}/assign`, body: { ...body, version: c.version } })} />
      <MpgForm title="Flasche zurückgeben" fields={[]} submitLabel="Rückgabe dokumentieren" onSubmit={() => action.mutateAsync({ path: `/cylinders/${c.id}/return`, body: { version: c.version } })} />
    </details>)}
    <details className="mpg-detail"><summary>Tauschflasche erfassen</summary><MpgForm title="Neue Sauerstoffflasche" initial={{ status: "FULL" }} fields={[textField("supplier", "Lieferant"), textField("cylinderNumber", "Flaschennummer"), { name: "sizeLiters", label: "Größe in Litern", type: "number", required: true, min: 0 }, { name: "locationId", label: "Standort", required: true, options: options(locations) }, { name: "status", label: "Status", required: true, options: ["FULL", "IN_USE", "EMPTY", "RETURNED"].map(value => ({ value, label: statusLabel(value) })) }, dateField("inspectedAt", "Geprüft am"), dateField("inspectionDueAt", "Prüfung fällig"), dateField("expiresAt", "Verfall")]} onSubmit={body => action.mutateAsync({ path: "/cylinders", body })} /></details>
  </section>;
}
