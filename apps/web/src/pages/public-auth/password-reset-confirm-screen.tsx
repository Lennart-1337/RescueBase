import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { toError } from "../../app/formatters";
import { ErrorPanel, InlineError, LoadingPanel } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import { publicQueries } from "../../queries/public";
import "../../app/auth/auth-form-layout.css";

export function PasswordResetConfirmScreen({ token }: { token: string }) {
  const navigate = useNavigate();
  const preview = useQuery(publicQueries.passwordResetPreview(token));
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const mutation = useMutation({ mutationFn: rescueBaseApi.confirmPasswordReset, onSuccess: async () => navigate({ search: {}, to: "/" }) });

  if (preview.isLoading) return <LoadingPanel label="Reset-Link wird geprüft" />;
  if (preview.isError || !preview.data) return <ErrorPanel error={toError(preview.error)} onRetry={() => void preview.refetch()} />;

  return (
    <Panel className="auth-panel">
      <div className="panel-header"><div><h2>Neues Passwort setzen</h2><p>{preview.data.email}</p></div><KeyRound /></div>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (password.length >= 12 && password === passwordRepeat && !mutation.isPending) mutation.mutate({ password, token });
        }}
      >
        <Field label="Passwort"><input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        <Field label="Passwort wiederholen"><input type="password" value={passwordRepeat} onChange={(event) => setPasswordRepeat(event.target.value)} /></Field>
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button disabled={password.length < 12 || password !== passwordRepeat} loading={mutation.isPending} type="submit">Passwort speichern</Button>
      </form>
    </Panel>
  );
}
