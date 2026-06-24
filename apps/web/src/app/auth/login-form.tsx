import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import { clearPendingLogin, loadPendingLogin, savePendingLogin } from "./pending-login";

export function LoginForm({ onDone }: { onDone: () => void }) {
  const [pendingLogin, setPendingLogin] = useState(() => loadPendingLogin());
  const [email, setEmail] = useState(pendingLogin?.email ?? "");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorMethod, setTwoFactorMethod] = useState<"TOTP" | "EMAIL" | "">(pendingLogin?.twoFactorMethod ?? "");
  const [debugCode, setDebugCode] = useState(pendingLogin?.debugCode ?? "");
  const [loginChallengeId, setLoginChallengeId] = useState(pendingLogin?.loginChallengeId ?? "");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(Boolean(pendingLogin));
  const usesPendingLogin = requiresTwoFactor && loginChallengeId.trim().length > 0;

  useEffect(() => {
    if (!usesPendingLogin || !pendingLogin) {
      clearPendingLogin();
      return;
    }
    savePendingLogin(pendingLogin);
  }, [pendingLogin, usesPendingLogin]);

  function resetPendingStep() {
    setPendingLogin(null);
    setRequiresTwoFactor(false);
    setTwoFactorMethod("");
    setTwoFactorCode("");
    setDebugCode("");
    setLoginChallengeId("");
    clearPendingLogin();
  }

  const mutation = useMutation({
    mutationFn: rescueBaseApi.login,
    onSuccess: (result) => {
      if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setTwoFactorMethod(result.twoFactorMethod ?? "");
        setDebugCode(result.debugCode ?? "");
        setLoginChallengeId(result.loginChallengeId ?? "");
        setPendingLogin(result.loginChallengeId && result.twoFactorMethod ? {
          email,
          debugCode: result.debugCode ?? "",
          loginChallengeId: result.loginChallengeId,
          twoFactorMethod: result.twoFactorMethod
        } : null);
        return;
      }
      resetPendingStep();
      onDone();
    }
  });
  const canSubmit = usesPendingLogin
    ? twoFactorCode.trim().length >= 6
    : email.trim().length > 3 && password.length > 0 && (!requiresTwoFactor || twoFactorCode.trim().length >= 6);

  return (
    <Panel className="auth-panel">
      <div className="panel-header"><div><h2>Anmelden</h2><p>Admin- und Lagerzugang für RescueBase.</p></div><ShieldCheck /></div>
      <div className="auth-form">
        <Field label="E-Mail"><input disabled={usesPendingLogin} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        {!usesPendingLogin ? <Field label="Passwort"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field> : null}
        {requiresTwoFactor ? <Field label="2FA-Code"><input inputMode="numeric" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} /></Field> : null}
        {requiresTwoFactor ? <p className="form-hint">{twoFactorMethod === "EMAIL" ? "Der Sicherheitscode wurde per E-Mail versendet." : "Bitte geben Sie den TOTP-Code aus Ihrer Authenticator-App ein."}</p> : null}
        {debugCode ? <p className="debug-hint">Lokaler Testcode: {debugCode}</p> : null}
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate(usesPendingLogin ? { loginChallengeId, twoFactorCode } : { email, password, twoFactorCode: twoFactorCode || undefined })} type="button">Anmelden</Button>
        {usesPendingLogin ? <Button onClick={resetPendingStep} type="button" variant="ghost">Neu starten</Button> : null}
        <Link className="text-link" to="/password-reset">Passwort vergessen</Link>
      </div>
    </Panel>
  );
}
