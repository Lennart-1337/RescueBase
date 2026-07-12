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
  const [currentPassword, setCurrentPassword] = useState("");
  const startEmail = useMutation({
    mutationFn: rescueBaseApi.startEmailTwoFactor,
    onSuccess: (result) => { setEmailChallengeId(result.challengeId); }
  });
  const enableEmail = useMutation({
    mutationFn: rescueBaseApi.enableEmailTwoFactor,
    onSuccess: async () => {
      setEmailCode("");
      setEmailChallengeId("");
      await queryClient.invalidateQueries({ queryKey: authKeys.session() });
    }
  });

  return (
    <Panel>
      <div className="panel-header"><div><h2>E-Mail-Code einrichten</h2></div><Mail /></div>
      <div className="auth-form">
        {!emailChallengeId ? <Field label="Aktuelles Passwort"><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field> : null}
        {!emailChallengeId ? <Button disabled={!currentPassword} loading={startEmail.isPending} onClick={() => startEmail.mutate({ currentPassword })} type="button">Code senden</Button> : null}
        {emailChallengeId ? <Field label="E-Mail-Code"><input autoComplete="one-time-code" inputMode="numeric" value={emailCode} onChange={(event) => setEmailCode(event.target.value)} /></Field> : null}
        {emailChallengeId ? <Button disabled={emailCode.trim().length < 6} loading={enableEmail.isPending} onClick={() => enableEmail.mutate({ challengeId: emailChallengeId, code: emailCode, currentPassword })} type="button">E-Mail-2FA aktivieren</Button> : null}
        {startEmail.error ? <InlineError error={startEmail.error} /> : null}
        {enableEmail.error ? <InlineError error={enableEmail.error} /> : null}
      </div>
    </Panel>
  );
}
