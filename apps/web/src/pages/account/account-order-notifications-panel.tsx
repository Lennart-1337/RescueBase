import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { rescueBaseApi } from "../../lib/api";
import type { AuthenticatedUser } from "../../lib/types";
import { InlineError } from "../../components/state-panels";
import { Button, Panel } from "../../components/ui";

export function AccountOrderNotificationsPanel({ user }: { user: AuthenticatedUser }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(Boolean(user.newOrderNotificationsEnabled));

  useEffect(() => {
    setEnabled(Boolean(user.newOrderNotificationsEnabled));
  }, [user.newOrderNotificationsEnabled]);

  const save = useMutation({
    mutationFn: rescueBaseApi.updateOrderNotifications,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["session"] })
  });

  return (
    <Panel>
      <div className="panel-header"><div><h2>Auftrags-E-Mails</h2><p>Optional per E-Mail informieren, wenn neue Nachfüllaufträge entstehen.</p></div><Bell /></div>
      <div className="auth-form">
        <label className="check-field">
          <input checked={enabled} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
          <span>Neue Nachfüllaufträge per E-Mail senden</span>
        </label>
        <div className="field-help">Die Benachrichtigung wird an Ihre hinterlegte Konto-E-Mail gesendet.</div>
        <Button disabled={save.isPending || enabled === Boolean(user.newOrderNotificationsEnabled)} onClick={() => save.mutate({ enabled })} type="button">
          {save.isPending ? "Speichert..." : "Speichern"}
        </Button>
        {save.error ? <InlineError error={save.error} /> : null}
      </div>
    </Panel>
  );
}
