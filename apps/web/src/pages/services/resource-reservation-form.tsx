import { useState } from "react";
import { Field } from "../../components/ui";
import { ServiceForm, datetime, options } from "./form";
import { newId, type ServiceEditorProps } from "./editor";
import { resourceLabels } from "./resource-reservations";
import type { ServiceReservation } from "./types";
export function ResourceReservationForm({
  service,
  catalog,
  save,
  locked,
  selected,
  initialVehicleId,
  onClose,
}: ServiceEditorProps & {
  selected?: ServiceReservation;
  initialVehicleId?: string;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<"VEHICLE" | "KIT">(
    selected?.kind === "KIT" ? "KIT" : "VEHICLE",
  );
  const resources =
    kind === "VEHICLE"
      ? catalog.vehicles.filter(
          (vehicle) => vehicle.active || vehicle.id === selected?.resourceId,
        )
      : catalog.kits;
  return (
    <>
      <Field label="Ressourcenart">
        <select
          disabled={Boolean(selected) || locked}
          value={kind}
          onChange={(event) => setKind(event.target.value as "VEHICLE" | "KIT")}
        >
          {(["VEHICLE", "KIT"] as const).map((value) => (
            <option key={value} value={value}>
              {resourceLabels[value]}
            </option>
          ))}
        </select>
      </Field>
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
          selected ?? {
            startsAt: service.startsAt,
            endsAt: service.endsAt,
            resourceId: kind === "VEHICLE" ? initialVehicleId : undefined,
          }
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
          onClose();
        }}
      />
    </>
  );
}
