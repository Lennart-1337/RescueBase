import { KeyRound, Pencil, Send, ShieldX, Trash2 } from "lucide-react";
import { RowActions } from "../../components/list-row";
import { PanelHeader } from "../../components/panel-header";
import { InlineError } from "../../components/state-panels";
import { Badge, Button, Panel } from "../../components/ui";
import type { UserSummary } from "../../lib/types";
import { formatUserRole } from "./user-role";
import { formatInvitationStatus } from "./user-status";
import "./user-list-panel.css";

export function UserListPanel(props: { currentUserId: string; error: Error | null; isSubmitting: boolean; onDelete: (id: string) => void; onEditProfile: (entry: UserSummary) => void; onEditRole: (entry: UserSummary) => void; onResendInvitation: (entry: UserSummary) => void; onRevokeInvitation: (entry: UserSummary) => void; onSecurity: (entry: UserSummary) => void; onToggle: (id: string, active: boolean) => void; users: UserSummary[] }) {
  const confirmDelete = (entry: UserSummary) => {
    if (window.confirm(`Benutzerkonto "${entry.displayName}" wirklich löschen?`)) {
      props.onDelete(entry.id);
    }
  };

  return (
    <Panel>
      <PanelHeader title="Benutzerkonten" />
      <div className="table">
        {props.users.map((entry) => (
          <div className="table-row user-row" key={entry.id}>
            <span><strong>{entry.displayName}</strong><small>{entry.email}</small></span>
            <Badge tone="neutral">{formatUserRole(entry.role)}</Badge>
            <Badge tone={entry.active ? "ready" : "warning"}>{entry.active ? "Aktiv" : "Ausstehend/Inaktiv"}</Badge>
            <Badge tone={entry.twoFactorEnabled ? "ready" : "neutral"}>{entry.twoFactorEnabled ? `2FA ${entry.twoFactorMethod}` : "2FA aus"}</Badge>
            <Badge tone="neutral">{entry.sessionCount} Sitzungen</Badge>
            {formatInvitationStatus(entry.invitationStatus) ? <Badge tone={entry.invitationStatus === "OPEN" ? "info" : "neutral"}>{formatInvitationStatus(entry.invitationStatus)}</Badge> : null}
            <RowActions>
              {entry.pendingEmail ? <small>Neue E-Mail: {entry.pendingEmail}</small> : null}
              {entry.id !== props.currentUserId ? <><Button aria-label={`${entry.displayName} bearbeiten`} disabled={props.isSubmitting} onClick={() => props.onEditProfile(entry)} type="button" variant="secondary"><Pencil data-icon="inline-start" />Bearbeiten</Button><Button aria-label={`${entry.displayName} Rolle ändern`} disabled={props.isSubmitting} onClick={() => props.onEditRole(entry)} type="button" variant="secondary">Rolle ändern</Button><Button aria-label={`${entry.displayName} Sicherheit`} disabled={props.isSubmitting} onClick={() => props.onSecurity(entry)} type="button" variant="secondary"><KeyRound data-icon="inline-start" />Sicherheit</Button></> : null}
              {entry.id !== props.currentUserId ? <Button className="user-toggle-button" disabled={props.isSubmitting} onClick={() => props.onToggle(entry.id, !entry.active)} type="button" variant={entry.active ? "danger" : "secondary"}>{entry.active ? "Deaktivieren" : "Aktivieren"}</Button> : null}
              {entry.invitationStatus === "OPEN" || entry.invitationStatus === "EXPIRED" || entry.invitationStatus === "REVOKED" ? <Button disabled={props.isSubmitting} onClick={() => props.onResendInvitation(entry)} type="button" variant="secondary"><Send data-icon="inline-start" />Einladung senden</Button> : null}
              {entry.invitationStatus === "OPEN" ? <Button disabled={props.isSubmitting} onClick={() => props.onRevokeInvitation(entry)} type="button" variant="secondary"><ShieldX data-icon="inline-start" />Einladung widerrufen</Button> : null}
              {entry.id !== props.currentUserId ? <Button aria-label={`${entry.displayName} löschen`} disabled={props.isSubmitting} onClick={() => confirmDelete(entry)} type="button" variant="danger"><Trash2 data-icon="inline-start" />Löschen</Button> : null}
            </RowActions>
          </div>
        ))}
      </div>
      {props.error ? <InlineError error={props.error} /> : null}
    </Panel>
  );
}
