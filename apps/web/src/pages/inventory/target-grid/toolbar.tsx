import { RotateCcw, Save } from "lucide-react";
import { Button, Field } from "../../../components/ui";
import type { Location } from "../../../lib/types";
type Props = {
  locations: Location[];
  locationId: string;
  articleCount: number;
  dirtyCount: number;
  isSaving: boolean;
  isValid: boolean;
  saved: boolean;
  onLocationChange: (id: string) => void;
  onSave: () => void;
  onDiscard: () => void;
};
export function TargetToolbar(props: Props) {
  return (
    <div className="target-grid-toolbar">
      <Field label="Lager">
        <select
          value={props.locationId}
          onChange={(event) => props.onLocationChange(event.target.value)}
          disabled={props.isSaving || !props.locations.length}
        >
          {props.locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="target-grid-status" role="status">
        {props.isSaving
          ? "Änderungen werden gespeichert …"
          : props.dirtyCount
            ? `${props.dirtyCount} ungespeicherte Änderungen`
            : props.saved
              ? "Alle Änderungen gespeichert"
              : `${props.articleCount} Artikel · keine offenen Änderungen`}
      </div>
      <div className="target-grid-actions">
        <Button
          type="button"
          variant="ghost"
          disabled={!props.dirtyCount || props.isSaving}
          onClick={props.onDiscard}
        >
          <RotateCcw data-icon="inline-start" />
          Zurücksetzen
        </Button>
        <Button
          type="button"
          disabled={!props.dirtyCount || !props.isValid || !props.locationId}
          loading={props.isSaving}
          onClick={props.onSave}
        >
          <Save data-icon="inline-start" />
          Änderungen speichern
        </Button>
      </div>
    </div>
  );
}
