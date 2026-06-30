import { Trash2 } from "lucide-react";
import { RowActions } from "../../components/list-row";
import { PanelHeader } from "../../components/panel-header";
import { InlineError } from "../../components/state-panels";
import { Badge, Button, Panel } from "../../components/ui";
import type { UserSummary } from "../../lib/types";
import { formatUserRole } from "./user-role";
import "./user-list-panel.css";

export function UserListPanel(props: { currentUserId: string; error: Error | null; isSubmitting: boolean; onDelete: (id: string) => void; onEditRole: (entry: UserSummary) => void; onToggle: (id: string, active: boolean) => void; users: UserSummary[] }) {
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
            <Badge tone={entry.role === "ADMIN" ? "danger" : "info"}>{formatUserRole(entry.role)}</Badge>
            <Badge tone={entry.active ? "ready" : "warning"}>{entry.active ? "Aktiv" : "Ausstehend/Inaktiv"}</Badge>
            <Badge tone={entry.twoFactorEnabled ? "ready" : "neutral"}>{entry.twoFactorEnabled ? `2FA ${entry.twoFactorMethod}` : "2FA aus"}</Badge>
            <RowActions>
              {entry.id !== props.currentUserId ? <Button aria-label={`${entry.displayName} Rolle ändern`} disabled={props.isSubmitting} onClick={() => props.onEditRole(entry)} type="button" variant="secondary">Rolle ändern</Button> : null}
              <Button disabled={props.isSubmitting} onClick={() => props.onToggle(entry.id, !entry.active)} type="button" variant={entry.active ? "danger" : "secondary"}>{entry.active ? "Deaktivieren" : "Aktivieren"}</Button>
              {entry.id !== props.currentUserId ? <Button aria-label={`${entry.displayName} löschen`} disabled={props.isSubmitting} onClick={() => confirmDelete(entry)} type="button" variant="danger"><Trash2 data-icon="inline-start" />Löschen</Button> : null}
            </RowActions>
          </div>
        ))}
      </div>
      {props.error ? <InlineError error={props.error} /> : null}
    </Panel>
  );
}
