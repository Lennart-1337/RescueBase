import { useEffect, useState } from "react";
import { Button, Dialog, Field } from "../../components/ui";
import type { UserSummary } from "../../lib/types";

export function UserProfileDialog(props: {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (body: { displayName: string; email: string }) => void;
  user: UserSummary | null;
}) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    setDisplayName(props.user?.displayName ?? "");
    setEmail(props.user?.email ?? "");
  }, [props.user]);

  return (
    <Dialog actions={<><Button onClick={props.onClose} type="button" variant="ghost">Abbrechen</Button><Button disabled={!displayName.trim() || !email.trim()} loading={props.isSubmitting} onClick={() => props.onSave({ displayName, email })} type="button">Änderungen speichern</Button></>} description={props.user ? "Eine neue E-Mail-Adresse wird erst nach Bestätigung aktiv." : undefined} onClose={props.onClose} open={props.isOpen} title="Benutzer bearbeiten">
      <div className="form-grid form-grid-two">
        <Field label="Name"><input autoFocus value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></Field>
        <Field label="E-Mail"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
      </div>
    </Dialog>
  );
}
