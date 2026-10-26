import {
  ChevronRight,
  ClipboardCheck,
  Package,
  Users,
  TriangleAlert,
} from "lucide-react";
import type { ServiceTab } from "./navigation";
import type { Service } from "./types";
export function OverviewPlanning({
  service,
  onTab,
}: {
  service: Service;
  onTab: (tab: ServiceTab) => void;
}) {
  const required = service.positions.reduce(
    (sum, position) => sum + position.quantity,
    0,
  );
  const personnelWarning = service.warnings.some((warning) =>
    [
      "UNDERSTAFFED",
      "QUALIFICATION",
      "LEADERSHIP",
      "PERSON_CONFLICT",
      "PERSON_INACTIVE",
      "NO_POSITIONS",
    ].includes(warning.code),
  );
  const done = service.tasks.filter((task) => task.done).length;
  const rows = [
    {
      tab: "personnel" as const,
      label: "Personal",
      icon: Users,
      text: `${service.assignments.length} eingeplant · ${required ? `Bedarf ${required}` : "Bedarf offen"}`,
      warning: personnelWarning,
    },
    {
      tab: "resources" as const,
      label: "Ressourcen",
      icon: Package,
      text: service.reservations.length
        ? `${service.reservations.length} reserviert`
        : "Keine reserviert",
      warning: service.warnings.some((warning) =>
        [
          "RESOURCE_NOT_READY",
          "RESOURCE_CONFLICT",
          "DUPLICATE_RESOURCE",
        ].includes(warning.code),
      ),
    },
    {
      tab: "preparation" as const,
      label: "Vorbereitung",
      icon: ClipboardCheck,
      text: service.tasks.length
        ? `${done} von ${service.tasks.length} erledigt`
        : "Keine Aufgaben",
      warning: false,
    },
  ];
  return (
    <section className="service-overview-planning">
      <h2>Planungsstand</h2>
      <div>
        {rows.map((row) => (
          <button type="button" key={row.tab} onClick={() => onTab(row.tab)}>
            <row.icon aria-hidden="true" size={23} />
            <strong>{row.label}</strong>
            <span
              className={row.warning ? "service-planning-warning" : undefined}
            >
              {row.warning ? (
                <TriangleAlert aria-label="Planungshinweis" size={19} />
              ) : null}
              {row.text}
            </span>
            <ChevronRight aria-hidden="true" size={19} />
          </button>
        ))}
      </div>
    </section>
  );
}
