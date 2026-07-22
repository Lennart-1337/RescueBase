import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { toError } from "../../app/formatters";
import { ErrorPanel, InlineError, LoadingPanel } from "../../components/state-panels";
import { Button, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import { publicQueries } from "../../queries/public";
import "../../app/auth/auth-form-layout.css";

export function EmailChangeConfirmScreen({ token }: { token: string }) {
  const navigate = useNavigate();
  const change = useQuery(publicQueries.emailChangePreview(token));
  const confirm = useMutation({ mutationFn: () => rescueBaseApi.confirmEmailChange(token), onSuccess: async () => navigate({ search: {}, to: "/" }) });

  if (change.isLoading) return <LoadingPanel label="E-Mail-Änderung wird geprüft" />;
  if (change.isError || !change.data) return <ErrorPanel error={toError(change.error)} onRetry={() => void change.refetch()} />;

  return (
    <Panel className="auth-panel">
      <div className="panel-header"><div><h2>E-Mail-Adresse bestätigen</h2><p>{change.data.email}</p></div><MailCheck /></div>
      <div className="auth-form">
        <p>Bestätigen Sie diese Adresse, damit sie künftig für die Anmeldung verwendet wird. Anschließend werden Sie auf allen Geräten abgemeldet.</p>
        {confirm.error ? <InlineError error={confirm.error} /> : null}
        <Button loading={confirm.isPending} onClick={() => confirm.mutate()} type="button">E-Mail-Adresse bestätigen</Button>
      </div>
    </Panel>
  );
}
