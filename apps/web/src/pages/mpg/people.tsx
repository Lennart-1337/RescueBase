import { AnchorButton } from "../../components/ui";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMpgAction } from "./api";
import { MpgDataTable } from "./data-table";
import { MpgForm } from "./form";
import { textField } from "./shared";
import type { Person } from "./types";

export function People({ people, isAdmin }: { people: Person[]; isAdmin?: boolean }) {
  const action = useMpgAction();
  const columns: DataTableColumn<Person>[] = [{ id: "person", label: "Person", render: person => <><strong>{person.name}</strong><small>{person.internalCode}</small></>, sortValue: person => person.name }, { id: "affiliation", label: "Zugehörigkeit", render: person => person.affiliation, sortValue: person => person.affiliation }, { id: "status", label: "Status", render: person => <span className={person.active ? "mpg-status mpg-status-ready" : "mpg-status mpg-status-neutral"}>{person.active ? "Aktiv" : "Inaktiv"}</span>, sortValue: person => person.active ? 1 : 0, width: "120px" }, { id: "records", label: "Nachweise", render: person => <AnchorButton variant="ghost" href={`/api/mpg/exports/people/${person.id}.pdf`}>Einweisungen PDF</AnchorButton>, width: "170px" }];
  return <section className="mpg-section"><header className="mpg-section-header"><div><h2>Personen</h2><p>{people.length} Personen · unabhängig von Benutzerkonten</p></div></header><p>Personen mit Nachweisen werden deaktiviert und nicht gelöscht.</p>
    <MpgDataTable columns={columns} emptyMessage="Noch keine Personen angelegt." getRowId={person => person.id} rows={people} />
    {people.map(person => <details className="mpg-detail" key={person.id}><summary>{person.name} bearbeiten</summary><MpgForm title={`Person bearbeiten: ${person.name}`} initial={{ name: person.name, internalCode: person.internalCode, affiliation: person.affiliation, active: person.active, instructorAuthorization: person.instructorAuthorization ?? "" }} fields={[textField("name", "Name"), textField("internalCode", "Interne Kennung"), textField("affiliation", "Zugehörigkeit"), { ...textField("instructorAuthorization", "Beauftragung als einweisende Person", false), type: "textarea" }, { name: "active", label: "Aktive Zugehörigkeit", type: "checkbox" }]} onSubmit={body => action.mutateAsync({ path: `/people/${person.id}`, method: "PATCH", body: { ...body, version: person.version } })} /></details>)}
    <details className="mpg-detail"><summary>Person anlegen</summary><MpgForm title="Neue Person" initial={{ active: true }} fields={[textField("name", "Name"), textField("internalCode", "Interne Kennung"), textField("affiliation", "Zugehörigkeit"), { ...textField("instructorAuthorization", "Beauftragung als einweisende Person", false), type: "textarea" }, { name: "active", label: "Aktive Zugehörigkeit", type: "checkbox" }]} onSubmit={body => action.mutateAsync({ path: "/people", body })} /></details>
    {isAdmin ? <AccessPermissions /> : null}
  </section>;
}

type PermissionUser = { id: string; displayName: string; email: string; role: string; medicalDevicesManage: boolean };
function AccessPermissions() {
  const client = useQueryClient();
  const users = useQuery({ queryKey: ["mpg-permissions", "users"], queryFn: async () => {
    const response = await fetch("/api/mpg-permissions/users", { credentials: "include" });
    if (!response.ok) throw new Error("Berechtigungen konnten nicht geladen werden.");
    return response.json() as Promise<PermissionUser[]>;
  } });
  const update = useMutation({ mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
    const response = await fetch(`/api/mpg-permissions/users/${id}`, { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ medicalDevicesManage: enabled }) });
    if (!response.ok) throw new Error("Berechtigung konnte nicht geändert werden.");
  }, onSuccess: () => client.invalidateQueries({ queryKey: ["mpg-permissions"] }) });
  const columns: DataTableColumn<PermissionUser>[] = [{ id: "user", label: "Benutzer", render: user => <><strong>{user.displayName}</strong><small>{user.email}</small></>, sortValue: user => user.displayName }, { id: "role", label: "Rolle", render: user => user.role === "ADMIN" ? "Admin" : "Lagerwart", sortValue: user => user.role, width: "140px" }, { id: "access", label: "MPG verwalten", render: user => <input aria-label={`MPG-Zugriff für ${user.displayName}`} type="checkbox" disabled={user.role === "ADMIN" || update.isPending} checked={user.role === "ADMIN" || user.medicalDevicesManage} onChange={event => update.mutate({ id: user.id, enabled: event.target.checked })} />, sortValue: user => user.role === "ADMIN" || user.medicalDevicesManage ? 1 : 0, width: "160px" }];
  return <section className="mpg-subsection"><h3>Zugriffsberechtigungen</h3><p>Administratoren haben immer Zugriff. Lagerwarte können gezielt für die zentrale MPG-Verwaltung freigeschaltet werden.</p>
    {users.error ? <p role="alert">{users.error.message}</p> : null}<MpgDataTable columns={columns} emptyMessage="Keine Benutzerkonten vorhanden." getRowId={user => user.id} rows={users.data ?? []} />
  </section>;
}
