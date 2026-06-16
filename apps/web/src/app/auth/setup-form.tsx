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

  return (
    <Panel className="auth-panel">
      <div className="panel-header"><div><h2>Erstadmin einrichten</h2><p>Dieses Konto verwaltet Benutzer, Lager und Rucksackvorlagen.</p></div><ShieldCheck /></div>
      <div className="auth-form">
        <Field label="Name"><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></Field>
        <Field label="E-Mail"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Passwort"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        <p className="form-hint">Mindestens 12 Zeichen.</p>
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate({ displayName, email, password })} type="button">Erstadmin erstellen</Button>
      </div>
    </Panel>
  );
}
