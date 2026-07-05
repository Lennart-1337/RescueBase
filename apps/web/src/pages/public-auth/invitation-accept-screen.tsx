import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { toError } from "../../app/formatters";
import { ErrorPanel, InlineError, LoadingPanel } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import { publicQueries } from "../../queries/public";
import "../../app/auth/auth-form-layout.css";

export function InvitationAcceptScreen({ token }: { token: string }) {
  const navigate = useNavigate();
  const invitation = useQuery(publicQueries.invitation(token));
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const accept = useMutation({ mutationFn: rescueBaseApi.acceptInvitation, onSuccess: async () => navigate({ search: {}, to: "/" }) });

  useEffect(() => { if (invitation.data?.displayName) setDisplayName(invitation.data.displayName); }, [invitation.data?.displayName]);
  if (invitation.isLoading) return <LoadingPanel label="Einladung wird geprüft" />;
  if (invitation.isError || !invitation.data) return <ErrorPanel error={toError(invitation.error)} onRetry={() => void invitation.refetch()} />;

  return (
    <Panel className="auth-panel">
      <div className="panel-header"><div><h2>Einladung annehmen</h2><p>{invitation.data.email} · {invitation.data.role === "ADMIN" ? "Admin" : "Lagerwart"}</p></div><Users /></div>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (displayName.trim() && password.length >= 12 && password === passwordRepeat && !accept.isPending) {
            accept.mutate({ displayName, password, token });
          }
        }}
      >
        <Field label="Name"><input autoFocus value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></Field>
        <Field label="Passwort"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        <Field label="Passwort wiederholen"><input type="password" value={passwordRepeat} onChange={(event) => setPasswordRepeat(event.target.value)} /></Field>
        {accept.error ? <InlineError error={accept.error} /> : null}
        <Button disabled={!displayName.trim() || password.length < 12 || password !== passwordRepeat} loading={accept.isPending} type="submit">Konto aktivieren</Button>
      </form>
    </Panel>
  );
}
