import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Badge, Button, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import type { AuthenticatedUser } from "../../lib/types";

export function AccountStatusPanel({ user }: { user: AuthenticatedUser }) {
  const queryClient = useQueryClient();
  const disable = useMutation({
    mutationFn: rescueBaseApi.disableTwoFactor,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["session"] })
  });

  return (
    <Panel>
      <div className="panel-header"><div><h2>Aktiver Schutz</h2><p>Aktueller Status Ihres Zugangs.</p></div><ShieldCheck /></div>
      <div className="compact-list"><div className="compact-list-row"><span><strong>{user.displayName}</strong><small>{user.email}</small></span><Badge tone={user.twoFactorEnabled ? "ready" : "warning"}>{user.twoFactorEnabled ? `2FA ${user.twoFactorMethod}` : "Nur Passwort"}</Badge></div></div>
      {disable.error ? <InlineError error={disable.error} /> : null}
      <div className="form-actions"><Button disabled={!user.twoFactorEnabled || disable.isPending} onClick={() => disable.mutate()} type="button" variant="danger">2FA deaktivieren</Button></div>
    </Panel>
  );
}
