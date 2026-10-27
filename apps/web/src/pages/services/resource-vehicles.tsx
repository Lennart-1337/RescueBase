import { Button } from "../../components/ui";
import { ServiceTable } from "./table";
import type { Vehicle } from "./types";
export function ResourceVehicles({
  vehicles,
  locked,
  reserve,
}: {
  vehicles: Vehicle[];
  locked: boolean;
  reserve: (id: string) => void;
}) {
  const active = vehicles.filter((vehicle) => vehicle.active);
  return (
    <section className="service-section" aria-label="Fahrzeuge">
      <header className="service-section-header">
        <h3>Fahrzeuge</h3>
        <a href="/admin/services?view=vehicles">Fahrzeuge verwalten</a>
      </header>
      <ServiceTable
        rows={active}
        empty={
          vehicles.length
            ? "Keine aktiven Fahrzeuge verfügbar."
            : "Noch keine Fahrzeuge angelegt."
        }
        columns={[
          {
            id: "name",
            label: "Fahrzeug",
            render: (row) => (
              <>
                <strong>{row.name}</strong>
                <small>
                  {row.registration} · {row.type}
                </small>
              </>
            ),
            sortValue: (row) => row.name,
          },
          {
            id: "ready",
            label: "Einsatzbereitschaft",
            render: (row) =>
              row.ready ? "Einsatzbereit" : "Nicht einsatzbereit",
          },
          {
            id: "actions",
            label: "Aktionen",
            render: (row) => (
              <Button
                variant="secondary"
                disabled={locked}
                aria-label={`${row.name} reservieren`}
                onClick={() => reserve(row.id)}
              >
                Reservieren
              </Button>
            ),
          },
        ]}
      />
    </section>
  );
}
