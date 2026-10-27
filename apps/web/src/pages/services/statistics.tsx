import { useState } from "react";
import { AnchorButton } from "../../components/ui";
import { ServiceForm, text, type ServiceField } from "./form";
import { useServices } from "./api";
import { QueryState } from "./query-state";
import { ServiceTable } from "./table";
import { StatisticsSummary } from "./statistics-summary";
import { statisticsColumns } from "./statistics-columns";
import type { ServiceStatistics } from "./types";
import "./service-tools.css";
const filters: ServiceField[] = [
  { name: "from", label: "Von", type: "date" },
  { name: "to", label: "Bis", type: "date" },
  text("eventType", "Veranstaltungsart"),
  text("customer", "Auftraggeber"),
];
export function Statistics({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const query = useServices<ServiceStatistics>(
    `/statistics${search ? `?${search}` : ""}`,
  );
  const params = new URLSearchParams(search);
  return (
    <div className="service-stack">
      <header className="service-section-header">
        <h2>Statistik</h2>
        <AnchorButton
          variant="secondary"
          href={`/api/services/statistics.csv${search ? `?${search}` : ""}`}
        >
          CSV exportieren
        </AnchorButton>
      </header>
      <details
        className="service-disclosure"
        open={filterOpen}
        onToggle={(event) => setFilterOpen(event.currentTarget.open)}
      >
        <summary>Filter{params.size ? ` (${params.size})` : ""}</summary>
        <ServiceForm
          key={search}
          title="Filter"
          fields={filters}
          hideLegend
          initial={Object.fromEntries(params)}
          submitLabel="Anwenden"
          onSubmit={async (values) => {
            const next = new URLSearchParams();
            for (const [key, value] of Object.entries(values))
              if (value != null) next.set(key, String(value));
            setSearch(next.toString());
            setFilterOpen(false);
          }}
        />
      </details>
      <QueryState query={query} />
      {query.data ? (
        <>
          <StatisticsSummary result={query.data} />
          <ServiceTable
            rows={query.data.rows}
            columns={statisticsColumns(onSelect)}
          />
        </>
      ) : null}
    </div>
  );
}
