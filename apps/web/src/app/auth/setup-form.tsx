import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";

export function SetupForm({ onDone }: { onDone: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({ mutationFn: rescueBaseApi.createFirstAdmin, onSuccess: onDone });
  const canSubmit = displayName.trim().length > 0 && email.trim().length > 3 && password.length >= 12;
  function submitSetup() {
    mutation.mutate({ displayName, email, password });
  }

  return (
    <Panel className="auth-panel">
      <div className="panel-header"><div><h2>Erstadmin einrichten</h2></div><ShieldCheck /></div>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit && !mutation.isPending) submitSetup();
        }}
      >
        <Field label="Name"><input autoFocus value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></Field>
        <Field label="E-Mail"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Passwort"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button disabled={!canSubmit || mutation.isPending} type="submit">Erstadmin erstellen</Button>
      </form>
    </Panel>
  );
}
