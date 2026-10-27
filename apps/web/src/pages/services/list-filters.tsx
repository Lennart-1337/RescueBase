import { useState } from "react";
import { SlidersHorizontal, Search } from "lucide-react";
import { Button, Field } from "../../components/ui";
import { serviceStatuses, statusLabels } from "./types";

export function ListFilters({
  onApply,
}: {
  onApply: (search: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const update = (key: string, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const advanced = ["from", "to", "customer", "eventType"].filter(
    (key) => values[key],
  ).length;
  return (
    <form
      role="search"
      aria-label="Dienste filtern"
      className="service-list-filters"
      onSubmit={(event) => {
        event.preventDefault();
        const search = new URLSearchParams();
        Object.entries(values).forEach(([key, value]) => {
          if (value.trim()) search.set(key, value.trim());
        });
        onApply(search.toString());
      }}
    >
      <div className="service-filter-bar">
        <div className="service-search">
          <Search aria-hidden size={17} />
          <input
            aria-label="Dienste suchen"
            type="search"
            value={values.search ?? ""}
            onChange={(event) => update("search", event.target.value)}
          />
        </div>
        <select
          aria-label="Status"
          value={values.status ?? ""}
          onChange={(event) => update("status", event.target.value)}
        >
          <option value="">Alle Status</option>
          {serviceStatuses.map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="ghost"
          aria-label="Weitere Filter"
          aria-expanded={expanded}
          aria-controls="service-list-extra-filters"
          onClick={() => setExpanded((value) => !value)}
        >
          <SlidersHorizontal size={16} />
          Filter{advanced ? ` (${advanced})` : ""}
        </Button>
        <Button type="submit" variant="secondary">
          Suchen
        </Button>
      </div>
      {expanded ? (
        <div id="service-list-extra-filters" className="service-filter-extra">
          {[
            ["from", "Von", "date"],
            ["to", "Bis", "date"],
            ["customer", "Auftraggeber", "text"],
            ["eventType", "Veranstaltungsart", "text"],
          ].map(([key, label, type]) => (
            <Field key={key} label={label!}>
              <input
                type={type}
                value={values[key!] ?? ""}
                onChange={(event) => update(key!, event.target.value)}
              />
            </Field>
          ))}
        </div>
      ) : null}
    </form>
  );
}
