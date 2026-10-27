import { Button } from "../../components/ui";
import { ServiceTable } from "./table";
import { displayTime } from "./time";
import type { Catalog, ServiceReservation } from "./types";
export const resourceLabels = {
  VEHICLE: "Fahrzeug",
  KIT: "Rucksack",
  DEVICE: "Gerät",
};
export function resourceNames(catalog: Catalog) {
  return new Map([
    ...catalog.vehicles.map((row) => [`VEHICLE:${row.id}`, row.name] as const),
    ...catalog.kits.map((row) => [`KIT:${row.id}`, row.name] as const),
    ...catalog.devices.map((row) => [`DEVICE:${row.id}`, row.name] as const),
  ]);
}
export function ResourceReservations({
  rows,
  catalog,
  locked,
  edit,
}: {
  rows: ServiceReservation[];
  catalog: Catalog;
  locked: boolean;
  edit: (row: ServiceReservation) => void;
}) {
  const names = resourceNames(catalog);
  return (
    <section className="service-section">
      <h3>Reservierungen</h3>
      <ServiceTable
        rows={rows}
        empty="Noch keine Ressourcen reserviert."
        columns={[
          {
            id: "resource",
            label: "Ressource",
            render: (row) => (
              <>
                <strong>
                  {names.get(`${row.kind}:${row.resourceId}`) ?? row.resourceId}
                </strong>
                <small>{resourceLabels[row.kind]}</small>
              </>
            ),
          },
          {
            id: "period",
            label: "Reserviert",
            render: (row) => (
              <>
                {displayTime(row.startsAt)}
                <small>bis {displayTime(row.endsAt)}</small>
              </>
            ),
          },
          {
            id: "actions",
            label: "Aktionen",
            render: (row) => (
              <Button variant="ghost" onClick={() => edit(row)}>
                {locked || row.kind === "DEVICE" ? "Ansehen" : "Bearbeiten"}
              </Button>
            ),
          },
        ]}
      />
    </section>
  );
}
