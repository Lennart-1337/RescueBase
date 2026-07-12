import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import "../../app/auth/auth-form-layout.css";

export function PasswordResetRequestScreen() {
  const [email, setEmail] = useState("");
  const mutation = useMutation({ mutationFn: rescueBaseApi.requestPasswordReset });

  return (
    <Panel className="auth-panel">
      <div className="panel-header"><div><h2>Passwort zurücksetzen</h2></div><KeyRound /></div>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (email.trim() && !mutation.isPending) mutation.mutate({ email });
        }}
      >
        <Field label="E-Mail"><input autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button disabled={!email.trim()} loading={mutation.isPending} type="submit">Reset-Link senden</Button>
        <Link className="text-link" search={{}} to="/">Zur Anmeldung</Link>
      </form>
    </Panel>
  );
}
