import type { DataTableColumn } from "../../components/data-table/data-table";
import { displayTime, formatMinutes } from "./time";
import { statusLabels, type ServiceStatisticRow } from "./types";
export function statisticsColumns(
  onSelect: (id: string) => void,
): DataTableColumn<ServiceStatisticRow>[] {
  return [
    {
      id: "title",
      label: "Dienst",
      render: (row) => (
        <button
          className="service-text-button"
          onClick={() => onSelect(row.id)}
        >
          <strong>{row.title}</strong>
          <small>
            {displayTime(row.startsAt)} · {statusLabels[row.status]}
          </small>
        </button>
      ),
      sortValue: (row) => row.title,
    },
    {
      id: "staff",
      label: "Besetzung",
      render: (row) =>
        row.occupancyRate == null
          ? "Kein Bedarf"
          : `${(row.occupancyRate * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`,
    },
    {
      id: "time",
      label: "Personalzeit Plan / Ist",
      render: (row) =>
        `${formatMinutes(row.plannedMinutes)} / ${formatMinutes(row.actualMinutes)}`,
    },
    {
      id: "medical",
      label: "Hilfeleistungen / Transporte",
      render: (row) =>
        `${row.outcome.treatments ?? "offen"} / ${row.outcome.transports ?? "offen"}`,
    },
    {
      id: "forecast",
      label: "Prognose",
      render: (row) =>
        row.supportOnly
          ? "Eigener Auftrag"
          : !row.forecastComparable
            ? "Besucherzahl offen"
            : row.forecasts.length
              ? row.forecasts.map((forecast) => (
                  <div key={`${forecast.method}-${forecast.createdAt}`}>
                    {forecast.method === "COLOGNE" ? "Köln" : "Maurer"}:{" "}
                    {forecast.metrics.expectedPresentations != null
                      ? `${forecast.metrics.expectedPresentations.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Hilfeleistungen`
                      : "Keine Fallzahlprognose"}
                  </div>
                ))
              : "Keine Prognose",
    },
  ];
}
