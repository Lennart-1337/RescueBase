import { useState } from "react";
import { Button, Dialog } from "../../components/ui";
import type { ServiceEditorProps } from "./editor";
import { resourceNames } from "./resource-reservations";
import { displayTime } from "./time";
import type { ServiceReservation } from "./types";
import { ResourceReservationForm } from "./resource-reservation-form";
export function ResourceReservationDialog({
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
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const deviceName = selected
    ? resourceNames(catalog).get(`${selected.kind}:${selected.resourceId}`)
    : undefined;
  return (
    <Dialog
      title={selected ? "Reservierung bearbeiten" : "Ressource reservieren"}
      open
      onClose={onClose}
      size="wide"
    >
      {selected?.kind === "DEVICE" ? (
        <p>
          <strong>{deviceName ?? selected.resourceId}</strong>
          <br />
          {displayTime(selected.startsAt)} bis {displayTime(selected.endsAt)}
        </p>
      ) : (
        <ResourceReservationForm
          service={service}
          catalog={catalog}
          save={save}
          locked={locked}
          selected={selected}
          initialVehicleId={initialVehicleId}
          onClose={onClose}
        />
      )}
      {selected && !locked ? (
        <Button
          variant="danger"
          loading={removing}
          onClick={async () => {
            setRemoving(true);
            setError("");
            try {
              await save({
                reservations: service.reservations.filter(
                  (row) => row.id !== selected.id,
                ),
              });
              onClose();
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Entfernen fehlgeschlagen.",
              );
            } finally {
              setRemoving(false);
            }
          }}
        >
          Reservierung entfernen
        </Button>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </Dialog>
  );
}
