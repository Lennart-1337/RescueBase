import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Mail, ShieldCheck } from "lucide-react";
import QRCode from "qrcode";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser } from "../lib/types";
import { Badge, Button, Field, Panel } from "../components/ui";
import { InlineError, copyText } from "../app/shared";

export function AccountPage({ user }: { user: AuthenticatedUser }) {
  const queryClient = useQueryClient();
  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totpQrUrl, setTotpQrUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [emailChallengeId, setEmailChallengeId] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [debugCode, setDebugCode] = useState("");
  const [copiedValue, setCopiedValue] = useState("");
  const setupTotp = useMutation({
    mutationFn: rescueBaseApi.setupTotp,
    onSuccess: (result) => {
      setTotpSetup(result);
      setTotpQrUrl("");
      setTotpCode("");
    }
  });
  const enableTotp = useMutation({
    mutationFn: rescueBaseApi.enableTotp,
    onSuccess: async () => {
      setTotpSetup(null);
      setTotpQrUrl("");
      setTotpCode("");
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  });
  const startEmail = useMutation({
    mutationFn: rescueBaseApi.startEmailTwoFactor,
    onSuccess: (result) => {
      setEmailChallengeId(result.challengeId);
      setDebugCode(result.debugCode ?? "");
    }
  });
  const enableEmail = useMutation({
    mutationFn: rescueBaseApi.enableEmailTwoFactor,
    onSuccess: async () => {
      setEmailCode("");
      setEmailChallengeId("");
      setDebugCode("");
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  });
  const disable = useMutation({
    mutationFn: rescueBaseApi.disableTwoFactor,
    onSuccess: async () => {
      setTotpSetup(null);
      setTotpQrUrl("");
      setTotpCode("");
      setEmailCode("");
      setEmailChallengeId("");
      setDebugCode("");
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  });

  useEffect(() => {
    if (!totpSetup) {
      setTotpQrUrl("");
      return;
    }
    void QRCode.toDataURL(totpSetup.otpauthUrl, { margin: 1, width: 220 }).then(setTotpQrUrl).catch(() => setTotpQrUrl(""));
  }, [totpSetup]);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Sicherheit</h1>
          <p>Passwortbasierter Login mit TOTP oder E-Mail-Code als zweitem Faktor.</p>
        </div>
      </header>
      <section className="admin-grid">
        <Panel>
          <div className="panel-header">
            <div>
              <h2>Aktiver Schutz</h2>
              <p>Aktueller Status Ihres Zugangs.</p>
            </div>
            <ShieldCheck />
          </div>
          <div className="compact-list">
            <div className="compact-list-row">
              <span>
                <strong>{user.displayName}</strong>
                <small>{user.email}</small>
              </span>
              <Badge tone={user.twoFactorEnabled ? "ready" : "warning"}>
                {user.twoFactorEnabled ? `2FA ${user.twoFactorMethod}` : "Nur Passwort"}
              </Badge>
            </div>
          </div>
          {disable.error ? <InlineError error={disable.error} /> : null}
          <div className="form-actions">
            <Button disabled={!user.twoFactorEnabled || disable.isPending} onClick={() => disable.mutate()} type="button" variant="danger">
              2FA deaktivieren
            </Button>
          </div>
        </Panel>
        <Panel>
          <div className="panel-header">
            <div>
              <h2>TOTP einrichten</h2>
              <p>Authenticator oder Passwortmanager per QR-Code koppeln und mit Prüfcode aktivieren.</p>
            </div>
            <KeyRound />
          </div>
          <div className="auth-form">
            {totpSetup ? (
              <>
                <div className="totp-setup-card">
                  {totpQrUrl ? <img alt="TOTP-QR-Code" className="totp-qr" src={totpQrUrl} /> : <div className="totp-qr-placeholder">QR wird erzeugt</div>}
                  <div className="totp-setup-copy">
                    <div className="copy-row">
                      <span>Geheimnis</span>
                      <strong>{totpSetup.secret}</strong>
                      <Button onClick={() => copyText(totpSetup.secret, "secret", setCopiedValue)} type="button" variant="ghost">
                        <Copy data-icon="inline-start" />
                        {copiedValue === "secret" ? "Kopiert" : "Kopieren"}
                      </Button>
                    </div>
                    <div className="copy-row">
                      <span>Einrichtungslink</span>
                      <small>{totpSetup.otpauthUrl}</small>
                      <Button onClick={() => copyText(totpSetup.otpauthUrl, "uri", setCopiedValue)} type="button" variant="ghost">
                        <Copy data-icon="inline-start" />
                        {copiedValue === "uri" ? "Kopiert" : "Kopieren"}
                      </Button>
                    </div>
                  </div>
                </div>
                <Field label="TOTP-Code">
                  <input inputMode="numeric" value={totpCode} onChange={(event) => setTotpCode(event.target.value)} />
                </Field>
                <Button disabled={totpCode.trim().length < 6 || enableTotp.isPending} onClick={() => enableTotp.mutate({ code: totpCode })} type="button">
                  TOTP aktivieren
                </Button>
              </>
            ) : (
              <Button disabled={setupTotp.isPending} onClick={() => setupTotp.mutate()} type="button">
                TOTP vorbereiten
              </Button>
            )}
            {setupTotp.error ? <InlineError error={setupTotp.error} /> : null}
            {enableTotp.error ? <InlineError error={enableTotp.error} /> : null}
          </div>
        </Panel>
      </section>
      <Panel>
        <div className="panel-header">
          <div>
            <h2>E-Mail-Code einrichten</h2>
            <p>Einmalcode an die hinterlegte E-Mail-Adresse senden und verifizieren.</p>
          </div>
          <Mail />
        </div>
        <div className="auth-form">
          {!emailChallengeId ? (
            <Button disabled={startEmail.isPending} onClick={() => startEmail.mutate()} type="button">
              Code senden
            </Button>
          ) : (
            <>
              <Field label="E-Mail-Code">
                <input inputMode="numeric" value={emailCode} onChange={(event) => setEmailCode(event.target.value)} />
              </Field>
              {debugCode ? <p className="debug-hint">Lokaler Testcode: {debugCode}</p> : null}
              <Button
                disabled={emailCode.trim().length < 6 || enableEmail.isPending}
                onClick={() => enableEmail.mutate({ challengeId: emailChallengeId, code: emailCode })}
                type="button"
              >
                E-Mail-2FA aktivieren
              </Button>
            </>
          )}
          {startEmail.error ? <InlineError error={startEmail.error} /> : null}
          {enableEmail.error ? <InlineError error={enableEmail.error} /> : null}
        </div>
      </Panel>
    </>
  );
}
