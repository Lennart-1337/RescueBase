import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import { betterAuthClient } from "../../lib/better-auth-client";
import { clearPendingLogin, loadPendingLogin, savePendingLogin } from "./pending-login";
import { AuthProgress } from "./auth-progress";
import { AnimatedContentSwap } from "../../motion/animated-containers";
import { TwoFactorCodeInput } from "./two-factor-code-input";
import "./auth-form-layout.css";

export function LoginForm({ onDone }: { onDone: () => void }) {
  const [pendingLogin, setPendingLogin] = useState(() => loadPendingLogin());
  const [email, setEmail] = useState(pendingLogin?.email ?? "");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
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
    setTwoFactorCode("");
    setLoginChallengeId("");
    clearPendingLogin();
  }

  function submitLogin() { mutation.mutate(); }

  const mutation = useMutation({
    mutationFn: async () => {
      if (usesPendingLogin) {
        const response = pendingLogin?.twoFactorMethod === "EMAIL"
          ? await betterAuthClient.twoFactor.verifyOtp({ code: twoFactorCode, trustDevice: false })
          : await betterAuthClient.twoFactor.verifyTotp({ code: twoFactorCode, trustDevice: false });
        const { error } = response;
        if (error) throw error;
        return { requiresTwoFactor: false };
      }
      const { data, error } = await betterAuthClient.signIn.email({ email, password });
      if (error) throw error;
      const result = data as { twoFactorRedirect?: boolean; twoFactorMethods?: string[] } | null;
      return { requiresTwoFactor: result?.twoFactorRedirect === true, twoFactorMethods: result?.twoFactorMethods ?? [] };
    },
    onSuccess: (result) => {
      if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setLoginChallengeId("better-auth");
        setPendingLogin({
          email,
          loginChallengeId: "better-auth",
          twoFactorMethod: result.twoFactorMethods?.includes("otp") ? "EMAIL" : "TOTP"
        });
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
      <div className="panel-header"><div><h2>Anmelden</h2><p>Sicherer Zugang zum Sanitätslager.</p></div><ShieldCheck /></div>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit && !mutation.isPending) submitLogin();
        }}
      >
        <AuthProgress currentStep={usesPendingLogin ? 2 : 1} />
        <AnimatedContentSwap contentKey={usesPendingLogin ? "two-factor" : "credentials"}>
          <div className="auth-step-fields">
            {usesPendingLogin ? <TwoFactorCodeInput onChange={setTwoFactorCode} value={twoFactorCode} /> : <>
              <Field label="E-Mail" required><input autoCapitalize="none" autoComplete="email" autoFocus required spellCheck={false} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
              <Field label="Passwort" required><input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
            </>}
          </div>
        </AnimatedContentSwap>
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button disabled={!canSubmit} loading={mutation.isPending} type="submit">Anmelden</Button>
        {usesPendingLogin ? <Button onClick={resetPendingStep} type="button" variant="ghost">Neu starten</Button> : null}
        <Link className="text-link" to="/password-reset">Passwort vergessen</Link>
      </form>
    </Panel>
  );
}
