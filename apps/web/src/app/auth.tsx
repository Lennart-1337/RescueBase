import type { ReactNode } from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { Button, Field, Panel } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser } from "../lib/types";
import { ErrorPanel, InlineError, LoadingPanel, toError } from "./shared";

export function AdminAuthGate({ children }: { children: (user: AuthenticatedUser) => ReactNode }) {
  const queryClient = useQueryClient();
  const setup = useQuery({ queryKey: ["setup-status"], queryFn: rescueBaseApi.setupStatus });
  const session = useQuery({
    queryKey: ["session"],
    queryFn: rescueBaseApi.session,
    enabled: setup.data?.initialized === true
  });

  if (setup.isLoading || (setup.data?.initialized && session.isLoading)) {
    return <LoadingPanel label="RescueBase wird geladen" />;
  }
  if (setup.isError) {
    return <ErrorPanel error={toError(setup.error)} onRetry={() => void setup.refetch()} />;
  }
  if (setup.data && !setup.data.initialized) {
    return (
      <AuthScreen>
        <SetupForm
          onDone={() =>
            void Promise.all([
              queryClient.invalidateQueries({ queryKey: ["setup-status"] }),
              queryClient.invalidateQueries({ queryKey: ["session"] })
            ])
          }
        />
      </AuthScreen>
    );
  }
  if (session.isError || !session.data?.user) {
    return (
      <AuthScreen>
        <LoginForm
          firstAdminEmail={setup.data?.firstAdminEmail}
          onDone={() => void queryClient.invalidateQueries({ queryKey: ["session"] })}
        />
      </AuthScreen>
    );
  }
  return children(session.data.user);
}

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <main className="auth-screen">
      <section className="auth-brand">
        <div className="brand-mark">RB</div>
        <h1>RescueBase</h1>
        <p>Sanitätslager, Rucksackchecks und Nachfüllaufträge.</p>
      </section>
      {children}
    </main>
  );
}

function SetupForm({ onDone }: { onDone: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({ mutationFn: rescueBaseApi.createFirstAdmin, onSuccess: onDone });
  const canSubmit = displayName.trim().length > 0 && email.trim().length > 3 && password.length >= 12;

  return (
    <Panel className="auth-panel">
      <div className="panel-header">
        <div>
          <h2>Erstadmin einrichten</h2>
          <p>Dieses Konto verwaltet Benutzer, Lager und Rucksackvorlagen.</p>
        </div>
        <ShieldCheck />
      </div>
      <div className="auth-form">
        <Field label="Name">
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </Field>
        <Field label="E-Mail">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Passwort">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <p className="form-hint">Mindestens 12 Zeichen.</p>
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate({ displayName, email, password })} type="button">
          Erstadmin erstellen
        </Button>
      </div>
    </Panel>
  );
}

function LoginForm({ firstAdminEmail, onDone }: { firstAdminEmail?: string; onDone: () => void }) {
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
      <div className="panel-header">
        <div>
          <h2>Anmelden</h2>
          <p>Admin- und Lagerzugang für RescueBase.</p>
        </div>
        <ShieldCheck />
      </div>
      <div className="auth-form">
        <Field label="E-Mail">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Passwort">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {requiresTwoFactor ? (
          <Field label="2FA-Code">
            <input inputMode="numeric" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} />
          </Field>
        ) : null}
        {requiresTwoFactor ? (
          <p className="form-hint">
            {twoFactorMethod === "EMAIL"
              ? "Der Sicherheitscode wurde per E-Mail versendet."
              : "Bitte geben Sie den TOTP-Code aus Ihrer Authenticator-App ein."}
          </p>
        ) : null}
        {debugCode ? <p className="debug-hint">Lokaler Testcode: {debugCode}</p> : null}
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button
          disabled={!canSubmit || mutation.isPending}
          onClick={() =>
            mutation.mutate({
              email,
              password,
              twoFactorCode: twoFactorCode || undefined,
              emailChallengeId: emailChallengeId || undefined
            })
          }
          type="button"
        >
          Anmelden
        </Button>
        <Link className="text-link" to="/passwort-vergessen">
          Passwort vergessen
        </Link>
      </div>
    </Panel>
  );
}
