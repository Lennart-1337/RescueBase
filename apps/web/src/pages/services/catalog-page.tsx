import { useState } from "react";
import { Button, Dialog } from "../../components/ui";
import { useCatalog, useServiceAction } from "./api";
import { ServiceForm, text, type ServiceField } from "./form";
import { QueryState } from "./query-state";
import { People } from "./people";
import { ServiceTable } from "./table";
import { type Catalog, type Checklist, type Vehicle } from "./types";
export type CatalogView = "people" | "vehicles" | "checklists";
const headings = {
  vehicles: "Fahrzeuge",
  checklists: "Vorbereitungslisten",
};
const fields: Record<Exclude<CatalogView, "people">, ServiceField[]> = {
  vehicles: [
    text("name", "Fahrzeugbezeichnung", true),
    text("registration", "Kennzeichen", true),
    text("type", "Fahrzeugtyp", true),
    { name: "ready", label: "Einsatzbereit", type: "checkbox" },
    { name: "notes", label: "Hinweise", type: "textarea" },
    { name: "active", label: "Aktiv", type: "checkbox" },
  ],
  checklists: [
    text("name", "Bezeichnung", true),
    {
      name: "taskText",
      label: "Aufgaben: eine je Zeile",
      type: "textarea",
      required: true,
    },
    { name: "active", label: "Aktiv", type: "checkbox" },
  ],
};
function CatalogRecords({
  catalog,
  view,
}: {
  catalog: Catalog;
  view: Exclude<CatalogView, "people">;
}) {
  const action = useServiceAction();
  const [editing, setEditing] = useState<Vehicle | Checklist | "new" | null>(
    null,
  );
  const row = editing && editing !== "new" ? editing : undefined;
  const records = catalog[view] as (Vehicle | Checklist)[];
  return (
    <section className="service-section">
      <header className="service-section-header">
        <div>
          <h2>{headings[view]}</h2>
        </div>
        <Button onClick={() => setEditing("new")}>Eintrag anlegen</Button>
      </header>
      <ServiceTable
        rows={records}
        columns={[
          {
            id: "name",
            label: "Bezeichnung",
            render: (record) => (
              <>
                <strong>{record.name}</strong>
                <small>
                  {"registration" in record
                    ? `${record.registration} · ${record.type}`
                    : `${record.tasks.length} Aufgaben`}
                </small>
              </>
            ),
            sortValue: (record) => record.name,
          },
          {
            id: "active",
            label: "Status",
            render: (record) =>
              !record.active
                ? "Inaktiv"
                : "ready" in record && !record.ready
                  ? "Nicht einsatzbereit"
                  : "Aktiv",
          },
          {
            id: "actions",
            label: "Aktionen",
            render: (record) => (
              <Button variant="ghost" onClick={() => setEditing(record)}>
                Bearbeiten
              </Button>
            ),
          },
        ]}
      />
      <Dialog
        title={
          row ? `${headings[view]} bearbeiten` : `${headings[view]} anlegen`
        }
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="wide"
      >
        {editing ? (
          <ServiceForm
            key={row?.id ?? "new"}
            title={headings[view]}
            fields={fields[view]}
            initial={
              row
                ? {
                    ...row,
                    ...("tasks" in row
                      ? { taskText: row.tasks.join("\n") }
                      : {}),
                  }
                : { active: true, ready: true }
            }
            onSubmit={async (values) => {
              const body = {
                ...values,
                ...(view === "checklists"
                  ? {
                      tasks: String(values.taskText ?? "")
                        .split("\n")
                        .map((task) => task.trim())
                        .filter(Boolean),
                    }
                  : {}),
                ...(row ? { version: row.version } : {}),
              };
              await action.mutateAsync({
                path: `/${view}${row ? `/${row.id}` : ""}`,
                method: row ? "PUT" : "POST",
                body,
              });
              setEditing(null);
            }}
          />
        ) : null}
      </Dialog>
    </section>
  );
}
export function CatalogPage({ view }: { view: CatalogView }) {
  const catalog = useCatalog();
  if (!catalog.data) return <QueryState query={catalog} />;
  return view === "people" ? (
    <People catalog={catalog.data} />
  ) : (
    <CatalogRecords key={view} view={view} catalog={catalog.data} />
  );
}
