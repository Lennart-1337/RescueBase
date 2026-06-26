import { useId } from "react";
import { Badge, cn } from "../../components/ui";
import "./alert-preference-card.css";

export type AlertCategoryOption = {
  key: "EXPIRY" | "STK_DUE" | "MTK_DUE";
  label: string;
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
  const titleId = useId();
  const selectedCount = Number(selected.has(subscriptionKey(category.key, null))) + locations.filter((location) => selected.has(subscriptionKey(category.key, location.id))).length;

  return (
    <section aria-labelledby={titleId} className="alert-category-card" role="group">
      <div className="alert-category-card-header">
        <h3 id={titleId}>{category.label}</h3>
        <Badge tone={selectedCount > 0 ? "info" : "neutral"}>{selectedCount} aktiv</Badge>
      </div>
      <AlertOption
        checked={selected.has(subscriptionKey(category.key, null))}
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
    </section>
  );
}

function AlertOption({ checked, label, onChange, tone }: { checked: boolean; label: string; onChange: () => void; tone?: "global" }) {
  return (
    <label className={cn("alert-option", checked && "alert-option-selected", tone === "global" && "alert-option-global")}>
      <input checked={checked} onChange={onChange} type="checkbox" />
      <span>
        <strong>{label}</strong>
      </span>
    </label>
  );
}
