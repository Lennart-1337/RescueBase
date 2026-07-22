import { KeyRound, MonitorOff, ShieldOff } from "lucide-react";
import { Button, Dialog } from "../../components/ui";
import type { UserSummary } from "../../lib/types";

export type UserSecurityAction = "password-reset" | "sessions" | "two-factor";

const actionCopy: Record<UserSecurityAction, { confirmation: string; label: string }> = {
  "password-reset": { label: "Passwort-Reset senden", confirmation: "Passwort-Reset-Mail wirklich senden?" },
  sessions: { label: "Alle Sitzungen beenden", confirmation: "Alle aktiven Sitzungen dieses Kontos wirklich beenden?" },
  "two-factor": { label: "2FA zurücksetzen", confirmation: "Die 2FA-Konfiguration wirklich zurücksetzen und alle Sitzungen beenden?" }
};

export function UserSecurityDialog(props: { isOpen: boolean; isSubmitting: boolean; onAction: (action: UserSecurityAction) => void; onClose: () => void; user: UserSummary | null }) {
  function run(action: UserSecurityAction) {
    if (window.confirm(actionCopy[action].confirmation)) props.onAction(action);
  }

  return (
    <Dialog description={props.user ? `${props.user.sessionCount} aktive Sitzungen · ${props.user.twoFactorEnabled ? `2FA ${props.user.twoFactorMethod}` : "2FA aus"}` : undefined} onClose={props.onClose} open={props.isOpen} title="Kontosicherheit">
      <div className="security-actions">
        <Button disabled={!props.user} loading={props.isSubmitting} onClick={() => run("password-reset")} type="button" variant="secondary"><KeyRound data-icon="inline-start" />{actionCopy["password-reset"].label}</Button>
        <Button disabled={!props.user || props.user.sessionCount === 0} loading={props.isSubmitting} onClick={() => run("sessions")} type="button" variant="secondary"><MonitorOff data-icon="inline-start" />{actionCopy.sessions.label}</Button>
        <Button disabled={!props.user || !props.user.twoFactorEnabled} loading={props.isSubmitting} onClick={() => run("two-factor")} type="button" variant="danger"><ShieldOff data-icon="inline-start" />{actionCopy["two-factor"].label}</Button>
      </div>
    </Dialog>
  );
}
