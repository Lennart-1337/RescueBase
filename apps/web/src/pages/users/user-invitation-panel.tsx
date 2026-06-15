import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Badge, Button, Field, Panel } from "../../components/ui";
import type { InviteUserRequest } from "../../lib/types";

export function UserInvitationPanel(props: { error: Error | null; isSubmitting: boolean; onInvite: (body: InviteUserRequest) => Promise<{ debugUrl?: string; invitationUrl: string }> }) {
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
    <Panel>
      <div className="panel-header"><div><h2>Benutzer einladen</h2><p>Einladungen laufen per E-Mail-Link mit eigenem Passwort-Setup.</p></div><Users /></div>
      <div className="form-grid form-grid-three">
        <Field label="Name"><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></Field>
        <Field label="E-Mail"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Rolle"><select value={role} onChange={(event) => setRole(event.target.value as "ADMIN" | "WAREHOUSE")}><option value="WAREHOUSE">Lagerwart</option><option value="ADMIN">Admin</option></select></Field>
      </div>
      {props.error ? <InlineError error={props.error} /> : null}
      {debugInvitationUrl ? <p className="debug-hint">Lokaler Einladungslink: {debugInvitationUrl}</p> : null}
      <div className="form-actions"><Button disabled={!displayName.trim() || !email.trim() || props.isSubmitting} onClick={() => void invite()} type="button"><Plus data-icon="inline-start" />Einladung senden</Button></div>
      <Badge tone="info">Nur Admins können Einladungen verwalten</Badge>
    </Panel>
  );
}
