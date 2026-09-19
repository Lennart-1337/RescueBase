import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { AnchorButton, Button } from "../../components/ui";
import type { UserSummary } from "../../lib/types";
import { useMpg, useMpgAction } from "./api";
import { Documents } from "./documents";
import { MpgFormDialog } from "./form-dialog";
import { dateField, textField } from "./shared";
import { displayDate, type Document, type Person } from "./types";

export function PersonDetail({ person, users, onDelete }: { person: Person; users: UserSummary[]; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const action = useMpgAction();
  const documents = useMpg<Document[]>(`/documents?personId=${person.id}`);
  const fields = [textField("name", "Name"), dateField("birthDate", "Geburtsdatum", true), { name: "userId", label: "Benutzerkonto (optional)", options: users.map(user => ({ value: user.id, label: `${user.displayName} · ${user.email}` })) }, { name: "active", label: "Aktiv", type: "checkbox" as const }, { name: "instructorAuthorized", label: "Darf Einweisungen durchführen", type: "checkbox" as const }, { ...textField("instructorAuthorization", "Dokumentierte Beauftragung", false), type: "textarea" as const }, { name: "qualificationDocumentId", label: "Qualifikationsnachweis", options: (documents.data ?? []).map(document => ({ value: document.id, label: `${document.filename} · v${document.version}` })) }, dateField("authorizationValidUntil", "Berechtigung gültig bis")];
  const initial = { name: person.name, birthDate: person.birthDate.slice(0, 10), userId: person.userId ?? "", active: person.active, instructorAuthorized: person.instructorAuthorized, instructorAuthorization: person.instructorAuthorization ?? "", qualificationDocumentId: person.qualificationDocumentId ?? "", authorizationValidUntil: person.authorizationValidUntil?.slice(0, 10) ?? "" };
  return <section className="mpg-detail-section"><header><div><h3>{person.name}</h3><p>Geboren am {displayDate(person.birthDate)} · {person.user ? `verknüpft mit ${person.user.displayName}` : "ohne Benutzerkonto"}</p></div><div className="mpg-row-actions"><AnchorButton variant="ghost" href={`/api/mpg/exports/people/${person.id}.pdf`}>Einweisungen PDF</AnchorButton><Button onClick={() => setEditing(true)} type="button" variant="secondary"><Pencil data-icon="inline-start" />Bearbeiten</Button><Button onClick={onDelete} type="button" variant="danger"><Trash2 data-icon="inline-start" />Löschen</Button></div></header>
    <p>{person.instructorAuthorized ? "Die globale Einweisungsberechtigung ist dokumentiert." : "Keine Einweisungsberechtigung dokumentiert."}</p>
    <Documents owner={{ personId: person.id }} />
    <MpgFormDialog fields={fields} initial={initial} onClose={() => setEditing(false)} onSubmit={body => action.mutateAsync({ path: `/people/${person.id}`, method: "PATCH", body: { ...body, version: person.version } })} open={editing} size="wide" submitLabel="Änderungen speichern" title="Person bearbeiten" />
  </section>;
}
