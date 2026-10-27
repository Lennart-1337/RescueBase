import { useState } from "react";
import { Button } from "../../components/ui";
import type { ServiceEditorProps } from "./editor";
import type { ServiceReservation } from "./types";
import { ResourceVehicles } from "./resource-vehicles";
import { ResourceReservations } from "./resource-reservations";
import { ResourceReservationDialog } from "./resource-reservation-dialog";
import "./resources.css";
export function Resources(props: ServiceEditorProps) {
  const [editing, setEditing] = useState<ServiceReservation | "new" | null>(
    null,
  );
  const [vehicleId, setVehicleId] = useState<string>();
  return (
    <div className="service-stack service-resources">
      <header className="service-section-header">
        <h2>Ressourcen</h2>
        <Button
          disabled={props.locked}
          onClick={() => {
            setVehicleId(undefined);
            setEditing("new");
          }}
        >
          Ressource reservieren
        </Button>
      </header>
      <ResourceVehicles
        vehicles={props.catalog.vehicles}
        locked={props.locked}
        reserve={(id) => {
          setVehicleId(id);
          setEditing("new");
        }}
      />
      <ResourceReservations
        rows={props.service.reservations}
        catalog={props.catalog}
        locked={props.locked}
        edit={setEditing}
      />
      {editing ? (
        <ResourceReservationDialog
          {...props}
          selected={editing === "new" ? undefined : editing}
          initialVehicleId={vehicleId}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
