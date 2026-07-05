import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound } from "lucide-react";
import QRCode from "qrcode";
import { copyText } from "../../app/clipboard";
import { InlineError } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import { authKeys } from "../../queries/auth";
import "../../app/auth/auth-form-layout.css";
import "./account-totp-panel.css";

export function AccountTotpPanel() {
  const queryClient = useQueryClient();
  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totpQrUrl, setTotpQrUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [copiedValue, setCopiedValue] = useState("");
  const setupTotp = useMutation({ mutationFn: rescueBaseApi.setupTotp, onSuccess: (result) => { setTotpSetup(result); setTotpQrUrl(""); setTotpCode(""); } });
  const enableTotp = useMutation({
    mutationFn: rescueBaseApi.enableTotp,
    onSuccess: async () => {
      setTotpSetup(null);
      setTotpQrUrl("");
      setTotpCode("");
      await queryClient.invalidateQueries({ queryKey: authKeys.session() });
    }
  });

  useEffect(() => {
    if (!totpSetup) return void setTotpQrUrl("");
    void QRCode.toDataURL(totpSetup.otpauthUrl, { margin: 1, width: 220 }).then(setTotpQrUrl).catch(() => setTotpQrUrl(""));
  }, [totpSetup]);

  return (
    <Panel>
      <div className="panel-header"><div><h2>TOTP einrichten</h2></div><KeyRound /></div>
      <div className="auth-form">
        {totpSetup ? <TotpSetupCard copiedValue={copiedValue} onCopy={setCopiedValue} qrUrl={totpQrUrl} setup={totpSetup} /> : <Button loading={setupTotp.isPending} onClick={() => setupTotp.mutate()} type="button">TOTP vorbereiten</Button>}
        {totpSetup ? <Field label="TOTP-Code"><input inputMode="numeric" value={totpCode} onChange={(event) => setTotpCode(event.target.value)} /></Field> : null}
        {totpSetup ? <Button disabled={totpCode.trim().length < 6} loading={enableTotp.isPending} onClick={() => enableTotp.mutate({ code: totpCode })} type="button">TOTP aktivieren</Button> : null}
        {setupTotp.error ? <InlineError error={setupTotp.error} /> : null}
        {enableTotp.error ? <InlineError error={enableTotp.error} /> : null}
      </div>
    </Panel>
  );
}

function TotpSetupCard(props: { copiedValue: string; onCopy: (value: string) => void; qrUrl: string; setup: { secret: string; otpauthUrl: string } }) {
  return (
    <div className="totp-setup-card">
      {props.qrUrl ? <img alt="TOTP-QR-Code" className="totp-qr" src={props.qrUrl} /> : <div className="totp-qr-placeholder">QR wird erzeugt</div>}
      <div className="totp-setup-copy">
        <div className="copy-row"><span>Geheimnis</span><strong>{props.setup.secret}</strong><Button onClick={() => copyText(props.setup.secret, "secret", props.onCopy)} type="button" variant="ghost"><Copy data-icon="inline-start" />{props.copiedValue === "secret" ? "Kopiert" : "Kopieren"}</Button></div>
        <div className="copy-row"><span>Einrichtungslink</span><small>{props.setup.otpauthUrl}</small><Button onClick={() => copyText(props.setup.otpauthUrl, "uri", props.onCopy)} type="button" variant="ghost"><Copy data-icon="inline-start" />{props.copiedValue === "uri" ? "Kopiert" : "Kopieren"}</Button></div>
      </div>
    </div>
  );
}
