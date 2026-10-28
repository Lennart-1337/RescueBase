import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button, Field } from "../../components/ui";
import { serviceStatuses, statusLabels } from "./types";
import { GermanDateInput, germanDateValue } from "./german-date-input";

export function ListFilters({
  onApply,
}: {
  onApply: (search: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
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
        setError("");
        try {
          const search = new URLSearchParams();
          Object.entries(values).forEach(([key, value]) => {
            if (value.trim()) search.set(key, ["from", "to"].includes(key) ? germanDateValue(value) : value.trim());
          });
          onApply(search.toString());
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Datum ungültig.");
        }
      }}
    >
      <div className="service-filter-bar">
        <Field label="Dienste suchen" className="service-search">
          <input
            aria-label="Dienste suchen"
            type="search"
            value={values.search ?? ""}
            onChange={(event) => update("search", event.target.value)}
          />
        </Field>
        <Field label="Status" className="service-status-filter">
          <select
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
        </Field>
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
              {type === "date" ? <GermanDateInput value={values[key!] ?? ""}
                onChange={(value) => update(key!, value)} /> : <input
                type={type}
                value={values[key!] ?? ""}
                onChange={(event) => update(key!, event.target.value)}
              />}
            </Field>
          ))}
        </div>
      ) : null}
      {error ? <p role="alert" className="service-error">{error}</p> : null}
    </form>
  );
}
