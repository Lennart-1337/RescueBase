import { useState } from "react";
import { Button, Dialog } from "../../components/ui";
import { useServiceAction } from "./api";
import { ServiceForm, text, type Values } from "./form";
import { ServiceTable } from "./table";
import { QualificationsEditor } from "./qualifications-editor";
import {
  qualificationLabels,
  type Catalog,
  type Person,
  type ServicePersonWrite,
} from "./types";
function PersonForm({
  person,
  catalog,
  onSave,
}: {
  person?: Person;
  catalog: Catalog;
  onSave: (values: Values) => Promise<unknown>;
}) {
  const [rows, setRows] = useState<ServicePersonWrite["qualifications"]>(
    person?.qualifications ?? [],
  );
  return (
    <ServiceForm
      title="Personalstammdaten"
      fields={[
        text("name", "Name", true),
        {
          name: "userId",
          label: "Benutzerkonto (optional)",
          options: catalog.users.map((user) => ({
            value: user.id,
            label: user.displayName,
          })),
        },
        { name: "active", label: "Aktiv", type: "checkbox" },
        { name: "leader", label: "Führungskraft", type: "checkbox" },
      ]}
      initial={person ?? { active: true, leader: false }}
      onSubmit={(values) =>
        onSave({
          ...values,
          qualifications: rows,
          ...(person ? { version: person.version } : {}),
        })
      }
    >
      <QualificationsEditor rows={rows} onChange={setRows} />
    </ServiceForm>
  );
}
export function People({ catalog }: { catalog: Catalog }) {
  const [editing, setEditing] = useState<Person | "new" | null>(null);
  const action = useServiceAction();
  const person = editing && editing !== "new" ? editing : undefined;
  return (
    <section className="service-section">
      <header className="service-section-header">
        <div>
          <h2>Personal</h2>
        </div>
        <Button onClick={() => setEditing("new")}>Person anlegen</Button>
      </header>
      <ServiceTable
        rows={catalog.people}
        columns={[
          {
            id: "name",
            label: "Name",
            render: (row) => <strong>{row.name}</strong>,
            sortValue: (row) => row.name,
          },
          {
            id: "qualifications",
            label: "Qualifikationen",
            render: (row) =>
              row.qualifications
                .map(
                  (q) =>
                    `${qualificationLabels[q.qualification]}${q.validUntil ? ` (bis ${q.validUntil.slice(0, 10)})` : ""}`,
                )
                .join(" · ") || "Keine dokumentiert",
          },
          {
            id: "role",
            label: "Funktion",
            render: (row) =>
              row.leader ? "Führungskraft" : "Keine Zusatzfunktion",
          },
          {
            id: "active",
            label: "Status",
            render: (row) => (row.active ? "Aktiv" : "Inaktiv"),
          },
          {
            id: "actions",
            label: "Aktionen",
            render: (row) => (
              <Button variant="ghost" onClick={() => setEditing(row)}>
                Bearbeiten
              </Button>
            ),
          },
        ]}
      />
      <Dialog
        title={person ? "Person bearbeiten" : "Person anlegen"}
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="wide"
      >
        {editing ? (
          <PersonForm
            key={person?.id ?? "new"}
            person={person}
            catalog={catalog}
            onSave={async (body) => {
              await action.mutateAsync({
                path: person ? `/people/${person.id}` : "/people",
                method: person ? "PUT" : "POST",
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
