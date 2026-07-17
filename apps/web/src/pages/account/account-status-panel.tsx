import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Badge, Button, Field, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import type { AuthenticatedUser } from "../../lib/types";
import { authKeys } from "../../queries/auth";
import "./account-status-panel.css";

export function AccountStatusPanel({ user }: { user: AuthenticatedUser }) {
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const disable = useMutation({
    mutationFn: rescueBaseApi.disableTwoFactor,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: authKeys.session() })
  });

  return (
    <Panel className="account-status-panel">
      <div className="panel-header"><div><h2>Aktiver Schutz</h2></div><ShieldCheck /></div>
      <div className="account-status-body">
        <div className="compact-list"><div className="compact-list-row"><span><strong>{user.displayName}</strong><small>{user.email}</small></span><Badge tone={user.twoFactorEnabled ? "ready" : "neutral"}>{user.twoFactorEnabled ? `2FA ${user.twoFactorMethod}` : "Nur Passwort"}</Badge></div></div>
        {disable.error ? <InlineError error={disable.error} /> : null}
        {user.twoFactorEnabled ? <Field className="account-status-password-field" label="Aktuelles Passwort"><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field> : null}
        <div className="form-actions account-status-actions"><Button disabled={!user.twoFactorEnabled || !currentPassword} loading={disable.isPending} onClick={() => disable.mutate({ currentPassword })} type="button" variant="danger">2FA deaktivieren</Button></div>
      </div>
    </Panel>
  );
}
