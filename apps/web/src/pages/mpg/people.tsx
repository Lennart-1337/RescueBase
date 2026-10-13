import { useState } from "react";
import { Plus } from "lucide-react";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { Button } from "../../components/ui";
import type { UserSummary } from "../../lib/types";
import { useMpgAction } from "./api";
import { MpgDataTable } from "./data-table";
import { MpgFormDialog } from "./form-dialog";
import { PersonDetail } from "./person-detail";
import { dateField, textField } from "./shared";
import { displayDate, type Person } from "./types";

export function People({ people, users }: { people: Person[]; users: UserSummary[] }) {
  const action = useMpgAction();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const selected = people.find(person => person.id === selectedId) ?? people[0] ?? null;
  const columns: DataTableColumn<Person>[] = [
    { id: "person", label: "Person", render: person => <><strong>{person.name}</strong><small>{person.birthDate ? `Geboren am ${displayDate(person.birthDate)}` : "Geburtsdatum fehlt"}</small></>, sortValue: person => person.name },
    { id: "account", label: "Benutzerkonto", render: person => person.user ? `${person.user.displayName} · ${person.user.email}` : "Nicht verknüpft", sortValue: person => person.user?.displayName ?? "" },
    { id: "instructor", label: "Einweisungsberechtigung", render: person => person.instructorAuthorized ? "Dokumentiert" : "Nein", sortValue: person => person.instructorAuthorized ? 1 : 0, width: "190px" },
    { id: "status", label: "Status", render: person => <span className={person.active ? "mpg-status mpg-status-ready" : "mpg-status mpg-status-neutral"}>{person.active ? "Aktiv" : "Inaktiv"}</span>, sortValue: person => person.active ? 1 : 0, width: "120px" }
  ];
  const createFields = [textField("name", "Name"), dateField("birthDate", "Geburtsdatum", true), { name: "userId", label: "Benutzerkonto (optional)", options: users.map(user => ({ value: user.id, label: `${user.displayName} · ${user.email}` })) }, { name: "active", label: "Aktiv", type: "checkbox" as const }];
  const remove = () => selected && window.confirm(`Person „${selected.name}“ wirklich löschen? Personen mit Nachweisen können nur deaktiviert werden.`) && action.mutate({ path: `/people/${selected.id}`, method: "DELETE", body: {} });
  return <section className="mpg-section"><header className="mpg-section-header"><div><h2>Personen</h2><p>{people.length} Personen · unabhängig von Benutzerkonten</p></div><Button onClick={() => setCreateOpen(true)} type="button"><Plus data-icon="inline-start" />Person anlegen</Button></header>
    <MpgDataTable columns={columns} emptyMessage="Noch keine Personen angelegt." getRowId={person => person.id} onRowClick={person => setSelectedId(person.id)} rows={people} selectedRowId={selected?.id} />
    {selected ? <PersonDetail person={selected} users={users} onDelete={remove} /> : null}
    <MpgFormDialog fields={createFields} initial={{ active: true }} intent="create" onClose={() => setCreateOpen(false)} onSubmit={body => action.mutateAsync({ path: "/people", body })} open={createOpen} submitLabel="Person anlegen" title="Person anlegen" />
  </section>;
}
