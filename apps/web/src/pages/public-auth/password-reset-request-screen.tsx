import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";

export function PasswordResetRequestScreen() {
  const [email, setEmail] = useState("");
  const mutation = useMutation({ mutationFn: rescueBaseApi.requestPasswordReset });

  return (
    <Panel className="auth-panel">
      <div className="panel-header"><div><h2>Passwort zurücksetzen</h2><p>Ein Link wird an die hinterlegte E-Mail-Adresse versendet.</p></div><KeyRound /></div>
      <div className="auth-form">
        <Field label="E-Mail"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        {mutation.data?.debugUrl ? <p className="debug-hint">Lokaler Reset-Link: {mutation.data.debugUrl}</p> : null}
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button disabled={!email.trim() || mutation.isPending} onClick={() => mutation.mutate({ email })} type="button">Reset-Link senden</Button>
        <Link className="text-link" to="/">Zur Anmeldung</Link>
      </div>
    </Panel>
  );
}
