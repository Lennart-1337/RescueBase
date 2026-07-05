import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import { authKeys } from "../../queries/auth";
import "../../app/auth/auth-form-layout.css";

export function AccountEmailPanel() {
  const queryClient = useQueryClient();
  const [emailChallengeId, setEmailChallengeId] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [debugCode, setDebugCode] = useState("");
  const startEmail = useMutation({
    mutationFn: rescueBaseApi.startEmailTwoFactor,
    onSuccess: (result) => { setEmailChallengeId(result.challengeId); setDebugCode(result.debugCode ?? ""); }
  });
  const enableEmail = useMutation({
    mutationFn: rescueBaseApi.enableEmailTwoFactor,
    onSuccess: async () => {
      setEmailCode("");
      setEmailChallengeId("");
      setDebugCode("");
      await queryClient.invalidateQueries({ queryKey: authKeys.session() });
    }
  });

  return (
    <Panel>
      <div className="panel-header"><div><h2>E-Mail-Code einrichten</h2></div><Mail /></div>
      <div className="auth-form">
        {!emailChallengeId ? <Button loading={startEmail.isPending} onClick={() => startEmail.mutate()} type="button">Code senden</Button> : null}
        {emailChallengeId ? <Field label="E-Mail-Code"><input inputMode="numeric" value={emailCode} onChange={(event) => setEmailCode(event.target.value)} /></Field> : null}
        {debugCode ? <p className="debug-hint">Lokaler Testcode: {debugCode}</p> : null}
        {emailChallengeId ? <Button disabled={emailCode.trim().length < 6} loading={enableEmail.isPending} onClick={() => enableEmail.mutate({ challengeId: emailChallengeId, code: emailCode })} type="button">E-Mail-2FA aktivieren</Button> : null}
        {startEmail.error ? <InlineError error={startEmail.error} /> : null}
        {enableEmail.error ? <InlineError error={enableEmail.error} /> : null}
      </div>
    </Panel>
  );
}
