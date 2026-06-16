import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";

export function LoginForm({ firstAdminEmail, onDone }: { firstAdminEmail?: string; onDone: () => void }) {
  const [email, setEmail] = useState(firstAdminEmail ?? "");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [emailChallengeId, setEmailChallengeId] = useState("");
  const [twoFactorMethod, setTwoFactorMethod] = useState<"TOTP" | "EMAIL" | "">("");
  const [debugCode, setDebugCode] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const mutation = useMutation({
    mutationFn: rescueBaseApi.login,
    onSuccess: (result) => {
      if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setTwoFactorMethod(result.twoFactorMethod ?? "");
        setEmailChallengeId(result.emailChallengeId ?? "");
        setDebugCode(result.debugCode ?? "");
        return;
      }
      setRequiresTwoFactor(false);
      setTwoFactorMethod("");
      setEmailChallengeId("");
      setDebugCode("");
      onDone();
    }
  });
  const canSubmit = email.trim().length > 3 && password.length > 0 && (!requiresTwoFactor || twoFactorCode.trim().length >= 6);

  return (
    <Panel className="auth-panel">
      <div className="panel-header"><div><h2>Anmelden</h2><p>Admin- und Lagerzugang für RescueBase.</p></div><ShieldCheck /></div>
      <div className="auth-form">
        <Field label="E-Mail"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Passwort"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        {requiresTwoFactor ? <Field label="2FA-Code"><input inputMode="numeric" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} /></Field> : null}
        {requiresTwoFactor ? <p className="form-hint">{twoFactorMethod === "EMAIL" ? "Der Sicherheitscode wurde per E-Mail versendet." : "Bitte geben Sie den TOTP-Code aus Ihrer Authenticator-App ein."}</p> : null}
        {debugCode ? <p className="debug-hint">Lokaler Testcode: {debugCode}</p> : null}
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate({ email, password, twoFactorCode: twoFactorCode || undefined, emailChallengeId: emailChallengeId || undefined })} type="button">Anmelden</Button>
        <Link className="text-link" to="/password-reset">Passwort vergessen</Link>
      </div>
    </Panel>
  );
}
