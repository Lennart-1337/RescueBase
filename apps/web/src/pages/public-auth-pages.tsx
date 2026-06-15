import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Users } from "lucide-react";
import { rescueBaseApi } from "../lib/api";
import { Button, Field, Panel } from "../components/ui";
import { ErrorPanel, InlineError, LoadingPanel, toError } from "../app/shared";

export function InvitationAcceptPage({ token }: { token: string }) {
  const navigate = useNavigate();
  const invitation = useQuery({ queryKey: ["invitation", token], queryFn: () => rescueBaseApi.invitation(token) });
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const accept = useMutation({
    mutationFn: rescueBaseApi.acceptInvitation,
    onSuccess: async () => {
      await navigate({ to: "/" });
    }
  });

  useEffect(() => {
    if (invitation.data?.displayName) {
      setDisplayName(invitation.data.displayName);
    }
  }, [invitation.data?.displayName]);

  if (invitation.isLoading) {
    return <LoadingPanel label="Einladung wird geprüft" />;
  }
  if (invitation.isError || !invitation.data) {
    return <ErrorPanel error={toError(invitation.error)} onRetry={() => void invitation.refetch()} />;
  }

  return (
    <Panel className="auth-panel">
      <div className="panel-header">
        <div>
          <h2>Einladung annehmen</h2>
          <p>
            {invitation.data.email} · {invitation.data.role === "ADMIN" ? "Admin" : "Lagerwart"}
          </p>
        </div>
        <Users />
      </div>
      <div className="auth-form">
        <Field label="Name">
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </Field>
        <Field label="Passwort">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <Field label="Passwort wiederholen">
          <input type="password" value={passwordRepeat} onChange={(event) => setPasswordRepeat(event.target.value)} />
        </Field>
        <p className="form-hint">Mindestens 12 Zeichen.</p>
        {accept.error ? <InlineError error={accept.error} /> : null}
        <Button
          disabled={!displayName.trim() || password.length < 12 || password !== passwordRepeat || accept.isPending}
          onClick={() => accept.mutate({ displayName, password, token })}
          type="button"
        >
          Konto aktivieren
        </Button>
      </div>
    </Panel>
  );
}

export function PasswordResetRequestPage() {
  const [email, setEmail] = useState("");
  const mutation = useMutation({ mutationFn: rescueBaseApi.requestPasswordReset });

  return (
    <Panel className="auth-panel">
      <div className="panel-header">
        <div>
          <h2>Passwort zurücksetzen</h2>
          <p>Ein Link wird an die hinterlegte E-Mail-Adresse versendet.</p>
        </div>
        <KeyRound />
      </div>
      <div className="auth-form">
        <Field label="E-Mail">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        {mutation.data?.debugUrl ? <p className="debug-hint">Lokaler Reset-Link: {mutation.data.debugUrl}</p> : null}
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button disabled={!email.trim() || mutation.isPending} onClick={() => mutation.mutate({ email })} type="button">
          Reset-Link senden
        </Button>
        <Link className="text-link" to="/">
          Zur Anmeldung
        </Link>
      </div>
    </Panel>
  );
}

export function PasswordResetConfirmPage({ token }: { token: string }) {
  const navigate = useNavigate();
  const preview = useQuery({ queryKey: ["password-reset-preview", token], queryFn: () => rescueBaseApi.passwordResetPreview(token) });
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const mutation = useMutation({
    mutationFn: rescueBaseApi.confirmPasswordReset,
    onSuccess: async () => {
      await navigate({ to: "/" });
    }
  });

  if (preview.isLoading) {
    return <LoadingPanel label="Reset-Link wird geprüft" />;
  }
  if (preview.isError || !preview.data) {
    return <ErrorPanel error={toError(preview.error)} onRetry={() => void preview.refetch()} />;
  }

  return (
    <Panel className="auth-panel">
      <div className="panel-header">
        <div>
          <h2>Neues Passwort setzen</h2>
          <p>{preview.data.email}</p>
        </div>
        <KeyRound />
      </div>
      <div className="auth-form">
        <Field label="Passwort">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <Field label="Passwort wiederholen">
          <input type="password" value={passwordRepeat} onChange={(event) => setPasswordRepeat(event.target.value)} />
        </Field>
        <p className="form-hint">Mindestens 12 Zeichen.</p>
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button
          disabled={password.length < 12 || password !== passwordRepeat || mutation.isPending}
          onClick={() => mutation.mutate({ password, token })}
          type="button"
        >
          Passwort speichern
        </Button>
      </div>
    </Panel>
  );
}
