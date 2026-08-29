import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import "./auth-form-layout.css";

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
        <Field label="Name" required><input autoFocus required value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></Field>
        <Field label="E-Mail" required><input autoCapitalize="none" autoComplete="email" required spellCheck={false} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Passwort" required><input autoComplete="new-password" minLength={12} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button disabled={!canSubmit} loading={mutation.isPending} type="submit">Erstadmin erstellen</Button>
      </form>
    </Panel>
  );
}
