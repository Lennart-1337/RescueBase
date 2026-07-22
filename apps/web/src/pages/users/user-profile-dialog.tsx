import { useEffect, useState } from "react";
import { SearchableSelect } from "../../components/searchable-select";
import { Button, Dialog, Field } from "../../components/ui";
import type { UserRole, UserSummary } from "../../lib/types";

const roleOptions = [
  { label: "Admin", value: "ADMIN" },
  { label: "Lagerwart", value: "WAREHOUSE" }
] as const;

export function UserProfileDialog(props: {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (body: { displayName: string; email: string; role: UserRole }) => void;
  user: UserSummary | null;
}) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("WAREHOUSE");

  useEffect(() => {
    setDisplayName(props.user?.displayName ?? "");
    setEmail(props.user?.email ?? "");
    setRole(props.user?.role ?? "WAREHOUSE");
  }, [props.user]);

  return (
    <Dialog actions={<><Button onClick={props.onClose} type="button" variant="ghost">Abbrechen</Button><Button disabled={!displayName.trim() || !email.trim()} loading={props.isSubmitting} onClick={() => props.onSave({ displayName, email, role })} type="button">Änderungen speichern</Button></>} description={props.user ? "Eine neue E-Mail-Adresse wird erst nach Bestätigung aktiv." : undefined} onClose={props.onClose} open={props.isOpen} title="Benutzer bearbeiten">
      <div className="form-grid form-grid-three">
        <Field label="Name"><input autoFocus value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></Field>
        <Field label="E-Mail"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Rolle"><SearchableSelect onChange={(value) => setRole(value as UserRole)} options={[...roleOptions]} value={role} /></Field>
      </div>
    </Dialog>
  );
}
