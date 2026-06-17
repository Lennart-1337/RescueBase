import { Badge, cn } from "../../components/ui";

export type AlertCategoryOption = {
  key: "EXPIRY" | "STK_DUE" | "MTK_DUE";
  label: string;
  description: string;
};

type AlertLocation = {
  id: string;
  name: string;
};

type AlertPreferenceCardProps = {
  category: AlertCategoryOption;
  locations: AlertLocation[];
  selected: Set<string>;
  onToggle: (category: AlertCategoryOption["key"], locationId?: string | null) => void;
  subscriptionKey: (category: string, locationId?: string | null) => string;
};

export function AlertPreferenceCard({ category, locations, onToggle, selected, subscriptionKey }: AlertPreferenceCardProps) {
  const selectedCount = Number(selected.has(subscriptionKey(category.key, null))) + locations.filter((location) => selected.has(subscriptionKey(category.key, location.id))).length;

  return (
    <fieldset className="alert-category-card">
      <legend>{category.label}</legend>
      <Badge tone={selectedCount > 0 ? "info" : "neutral"}>{selectedCount} aktiv</Badge>
      <p>{category.description}</p>
      <AlertOption
        checked={selected.has(subscriptionKey(category.key, null))}
        help="Gilt für alle aktuellen und zukünftigen Standorte."
        label="Alle Standorte"
        onChange={() => onToggle(category.key, null)}
        tone="global"
      />
      <div className="alert-location-section">
        <span>Einzelne Standorte</span>
        {locations.length ? (
          <div className="alert-location-list">
            {locations.map((location) => (
              <AlertOption
                checked={selected.has(subscriptionKey(category.key, location.id))}
                key={location.id}
                label={location.name}
                onChange={() => onToggle(category.key, location.id)}
              />
            ))}
          </div>
        ) : (
          <div className="alert-location-empty">Noch keine Standorte angelegt.</div>
        )}
      </div>
    </fieldset>
  );
}

function AlertOption({ checked, help, label, onChange, tone }: { checked: boolean; help?: string; label: string; onChange: () => void; tone?: "global" }) {
  return (
    <label className={cn("alert-option", checked && "alert-option-selected", tone === "global" && "alert-option-global")}>
      <input checked={checked} onChange={onChange} type="checkbox" />
      <span>
        <strong>{label}</strong>
        {help ? <small>{help}</small> : null}
      </span>
    </label>
  );
}
