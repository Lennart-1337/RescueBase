import { Button, Field } from "../../components/ui";
import type { Zone } from "./calculation-input";
export function CalculationZones({
  zones,
  onChange,
}: {
  zones: Zone[];
  onChange: (zones: Zone[]) => void;
}) {
  const update = (key: string, field: keyof Zone, value: string) =>
    onChange(
      zones.map((zone) =>
        zone.key === key ? { ...zone, [field]: value } : zone,
      ),
    );
  return (
    <fieldset className="service-zones">
      <legend>Wachbezirke</legend>
      {zones.map((zone) => (
        <div className="service-zone" key={zone.key}>
          <Field label="Wachbezirk">
            <input
              required
              value={zone.id}
              onChange={(event) => update(zone.key, "id", event.target.value)}
            />
          </Field>
          <Field label="Besucher im Wachbezirk">
            <input
              type="number"
              min="1"
              step="1"
              required
              value={zone.expectedVisitors}
              onChange={(event) =>
                update(zone.key, "expectedVisitors", event.target.value)
              }
            />
          </Field>
          <Field label="Risikofaktor im Wachbezirk">
            <input
              inputMode="decimal"
              required
              value={zone.riskFactor}
              onChange={(event) =>
                update(zone.key, "riskFactor", event.target.value)
              }
            />
          </Field>
          <Button
            variant="ghost"
            type="button"
            onClick={() =>
              onChange(zones.filter((entry) => entry.key !== zone.key))
            }
          >
            Wachbezirk entfernen
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          onChange([
            ...zones,
            {
              key: crypto.randomUUID(),
              id: "",
              expectedVisitors: "",
              riskFactor: "",
            },
          ])
        }
      >
        Wachbezirk hinzufügen
      </Button>
    </fieldset>
  );
}
