import { ListFilters } from "./list-filters";
import { useState } from "react";
import { Button, Dialog } from "../../components/ui";
import { useCatalog, useServiceAction, useServices } from "./api";
import { ServiceForm } from "./form";
import {
  emptyService,
  normalizeOverview,
  overviewFields,
  overviewInitial,
} from "./service-fields";
import { QueryState } from "./query-state";
import { ServiceTable } from "./table";
import { displayTime } from "./time";
import { statusLabels, type Service } from "./types";
function CreateService({ onCreated }: { onCreated: (id: string) => void }) {
  const catalog = useCatalog();
  const action = useServiceAction();
  if (!catalog.data) return <QueryState query={catalog} />;
  return (
    <ServiceForm
      title="Neuen Sanitätsdienst anlegen"
      fields={overviewFields(catalog.data)}
      initial={overviewInitial({ supportOnly: false })}
      hideLegend
      submitLabel="Dienst anlegen"
      onSubmit={async (values) => {
        const created = await action.mutateAsync({
          path: "",
          body: { ...emptyService(), ...normalizeOverview(values) },
        });
        onCreated(created.id);
      }}
    />
  );
}
export function ServiceList({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const query = useServices<Service[]>(search ? `?${search}` : "");
  return (
    <div className="service-stack">
      <div className="service-list-toolbar">
        <ListFilters onApply={setSearch} />
        <Button onClick={() => setCreating(true)}>Dienst anlegen</Button>
      </div>
      <QueryState query={query} />
      {query.data ? (
        <ServiceTable
          rows={query.data}
          onSelect={(service) => onSelect(service.id)}
          empty="Noch keine Dienste für diese Auswahl."
          columns={[
            {
              id: "title",
              label: "Dienst",
              render: (service) => (
                <button
                  className="service-text-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(service.id);
                  }}
                >
                  <strong>{service.title}</strong>
                  <small>{service.location}</small>
                </button>
              ),
              sortValue: (service) => service.title,
            },
            {
              id: "time",
              label: "Zeitraum",
              render: (service) => (
                <>
                  {displayTime(service.startsAt)}
                  <small>bis {displayTime(service.endsAt)}</small>
                </>
              ),
              sortValue: (service) => service.startsAt,
            },
            {
              id: "customer",
              label: "Auftraggeber",
              render: (service) => (
                <>
                  {service.customer}
                  <small>
                    {service.supportOnly ? "Unterstützung" : service.eventType}
                  </small>
                </>
              ),
              sortValue: (service) => service.customer,
            },
            {
              id: "status",
              label: "Status",
              render: (service) => statusLabels[service.status],
              sortValue: (service) => statusLabels[service.status],
            },
            {
              id: "warnings",
              label: "Hinweise",
              render: (service) =>
                service.warnings.length
                  ? `${service.warnings.length} offen`
                  : "Keine",
            },
          ]}
        />
      ) : null}
      <Dialog
        title="Dienst anlegen"
        open={creating}
        onClose={() => setCreating(false)}
        size="wide"
      >
        {creating ? (
          <CreateService
            onCreated={(id) => {
              setCreating(false);
              onSelect(id);
            }}
          />
        ) : null}
      </Dialog>
    </div>
  );
}
