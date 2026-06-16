import { Plus } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Badge, Button, Panel } from "../../components/ui";
import type { UserSummary } from "../../lib/types";

export function UserListPanel(props: { error: Error | null; isSubmitting: boolean; onInviteClick: () => void; onToggle: (id: string, active: boolean) => void; users: UserSummary[] }) {
  return (
    <Panel>
      <div className="panel-header"><div><h2>Benutzerkonten</h2><p>Aktivierung, Deaktivierung und 2FA-Status.</p></div><div className="topbar-actions"><Badge tone="info">{props.users.length} Konten</Badge><Button onClick={props.onInviteClick} type="button"><Plus data-icon="inline-start" />Benutzer einladen</Button></div></div>
      <div className="table">
        {props.users.map((entry) => (
          <div className="table-row user-row" key={entry.id}>
            <span><strong>{entry.displayName}</strong><small>{entry.email}</small></span>
            <Badge tone={entry.role === "ADMIN" ? "danger" : "info"}>{entry.role === "ADMIN" ? "Admin" : "Lagerwart"}</Badge>
            <Badge tone={entry.active ? "ready" : "warning"}>{entry.active ? "Aktiv" : "Ausstehend/Inaktiv"}</Badge>
            <Badge tone={entry.twoFactorEnabled ? "ready" : "neutral"}>{entry.twoFactorEnabled ? `2FA ${entry.twoFactorMethod}` : "2FA aus"}</Badge>
            <div className="row-actions"><Button disabled={props.isSubmitting} onClick={() => props.onToggle(entry.id, !entry.active)} type="button" variant={entry.active ? "danger" : "secondary"}>{entry.active ? "Deaktivieren" : "Aktivieren"}</Button></div>
          </div>
        ))}
      </div>
      {props.error ? <InlineError error={props.error} /> : null}
    </Panel>
  );
}
