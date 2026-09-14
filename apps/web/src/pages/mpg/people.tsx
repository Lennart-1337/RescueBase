import { AnchorButton } from "../../components/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMpgAction } from "./api";
import { MpgForm } from "./form";
import { MpgTable, textField } from "./shared";
import type { Person } from "./types";

export function People({ people, isAdmin }: { people: Person[]; isAdmin?: boolean }) {
  const action = useMpgAction();
  return <section><h2>Personen</h2><p>Personen werden unabhängig von Benutzerkonten geführt. Personen mit Nachweisen werden deaktiviert und nicht gelöscht.</p>
    <MpgTable headings={["Name", "Kennung", "Zugehörigkeit", "Status", "Nachweise"]} empty={!people.length}>{people.map(person => <tr key={person.id}><td>{person.name}</td><td>{person.internalCode}</td><td>{person.affiliation}</td><td>{person.active ? "Aktiv" : "Inaktiv"}</td><td><AnchorButton variant="ghost" href={`/api/mpg/exports/people/${person.id}.pdf`}>Einweisungen PDF</AnchorButton></td></tr>)}</MpgTable>
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
  return <section><h3>Zugriffsberechtigungen</h3><p>Administratoren haben immer Zugriff. Lagerwarte können gezielt für die zentrale MPG-Verwaltung freigeschaltet werden.</p>
    {users.error ? <p role="alert">{users.error.message}</p> : null}<MpgTable headings={["Benutzer", "Rolle", "MPG verwalten"]} empty={users.data?.length === 0}>{users.data?.map(user => <tr key={user.id}><td>{user.displayName}<br /><small>{user.email}</small></td><td>{user.role === "ADMIN" ? "Admin" : "Lagerwart"}</td><td><input aria-label={`MPG-Zugriff für ${user.displayName}`} type="checkbox" disabled={user.role === "ADMIN" || update.isPending} checked={user.role === "ADMIN" || user.medicalDevicesManage} onChange={event => update.mutate({ id: user.id, enabled: event.target.checked })} /></td></tr>)}</MpgTable>
  </section>;
}
