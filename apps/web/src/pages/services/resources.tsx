import { useState } from "react";
import { Button, Dialog, Field } from "../../components/ui";
import { ServiceForm, datetime, options } from "./form";
import type { ServiceEditorProps } from "./editor";
import { newId } from "./editor";
import { ServiceTable } from "./table";
import { displayTime } from "./time";
import type { ServiceReservation } from "./types";
const labels = { VEHICLE: "Fahrzeug", KIT: "Rucksack", DEVICE: "Gerät" };
export function Resources({
  service,
  catalog,
  save,
  locked,
}: ServiceEditorProps) {
  const [kind, setKind] = useState<ServiceReservation["kind"]>("VEHICLE");
  const [editing, setEditing] = useState<ServiceReservation | "new" | null>(
    null,
  );
  const [error, setError] = useState("");
  const resources =
    kind === "VEHICLE"
      ? catalog.vehicles.filter((vehicle) => vehicle.active)
      : kind === "KIT"
        ? catalog.kits
        : catalog.devices;
  const names = new Map(
    [...catalog.vehicles, ...catalog.kits, ...catalog.devices].map(
      (resource) => [resource.id, resource.name],
    ),
  );
  const selected = editing && editing !== "new" ? editing : undefined;
  return (
    <section className="service-section">
      <header className="service-section-header">
        <div>
          <h2>Ressourcen</h2>
        </div>
        <Button
          disabled={locked}
          onClick={() => {
            setKind("VEHICLE");
            setEditing("new");
          }}
        >
          Ressource reservieren
        </Button>
      </header>
      <ServiceTable
        rows={service.reservations}
        columns={[
          {
            id: "resource",
            label: "Ressource",
            render: (row) => (
              <>
                <strong>{names.get(row.resourceId) ?? row.resourceId}</strong>
                <small>{labels[row.kind]}</small>
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
              <Button
                variant="ghost"
                onClick={() => {
                  setKind(row.kind);
                  setEditing(row);
                }}
              >
                {locked ? "Ansehen" : "Bearbeiten"}
              </Button>
            ),
          },
        ]}
      />
      <Dialog
        title={selected ? "Reservierung bearbeiten" : "Ressource reservieren"}
        open={editing !== null}
        onClose={() => {
          setEditing(null);
          setError("");
        }}
        size="wide"
      >
        <Field label="Ressourcenart">
          <select
            disabled={Boolean(selected) || locked}
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as ServiceReservation["kind"])
            }
          >
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        {editing ? (
          <ServiceForm
            key={`${kind}-${selected?.id ?? "new"}`}
            title="Reservierungszeitraum"
            hideLegend
            disabled={locked}
            fields={[
              options("resourceId", "Ressource", resources, true),
              datetime("startsAt", "Beginn", true),
              datetime("endsAt", "Ende", true),
            ]}
            initial={
              selected ?? { startsAt: service.startsAt, endsAt: service.endsAt }
            }
            onSubmit={async (values) => {
              const reservation = {
                ...values,
                id: selected?.id ?? newId(),
                kind,
              } as ServiceReservation;
              await save({
                reservations: selected
                  ? service.reservations.map((row) =>
                      row.id === selected.id ? reservation : row,
                    )
                  : [...service.reservations, reservation],
              });
              setEditing(null);
            }}
          />
        ) : null}
        {selected && !locked ? (
          <Button
            variant="danger"
            onClick={async () => {
              try {
                await save({
                  reservations: service.reservations.filter(
                    (row) => row.id !== selected.id,
                  ),
                });
                setEditing(null);
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Entfernen fehlgeschlagen.",
                );
              }
            }}
          >
            Reservierung entfernen
          </Button>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
      </Dialog>
    </section>
  );
}
