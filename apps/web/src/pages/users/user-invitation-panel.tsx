import { useState } from "react";
import { Plus, X } from "lucide-react";
import { SearchableSelect } from "../../components/searchable-select";
import { InlineError } from "../../components/state-panels";
import { Button, Dialog, Field } from "../../components/ui";
import type { InviteUserRequest } from "../../lib/types";

export function UserInvitationPanel(props: { error: Error | null; isOpen: boolean; isSubmitting: boolean; onClose: () => void; onInvite: (body: InviteUserRequest) => Promise<{ debugUrl?: string; invitationUrl: string }> }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "WAREHOUSE">("WAREHOUSE");
  const [debugInvitationUrl, setDebugInvitationUrl] = useState("");

  async function invite() {
    const result = await props.onInvite({ displayName, email, role });
    setDisplayName("");
    setEmail("");
    setRole("WAREHOUSE");
    setDebugInvitationUrl(result.debugUrl ?? result.invitationUrl);
  }

  return (
    <Dialog actions={<><Button onClick={props.onClose} type="button" variant="ghost"><X data-icon="inline-start" />Schließen</Button><Button disabled={!displayName.trim() || !email.trim()} loading={props.isSubmitting} onClick={() => void invite()} type="button"><Plus data-icon="inline-start" />Einladung senden</Button></>} onClose={props.onClose} open={props.isOpen} title="Benutzer einladen">
      <div className="form-grid form-grid-three">
        <Field label="Name"><input autoFocus value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></Field>
        <Field label="E-Mail"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Rolle"><SearchableSelect onChange={(value) => setRole(value as "ADMIN" | "WAREHOUSE")} options={[{ label: "Lagerwart", value: "WAREHOUSE" }, { label: "Admin", value: "ADMIN" }]} value={role} /></Field>
      </div>
      {props.error ? <InlineError error={props.error} /> : null}
      {debugInvitationUrl ? <p className="debug-hint">Lokaler Einladungslink: {debugInvitationUrl}</p> : null}
    </Dialog>
  );
}
