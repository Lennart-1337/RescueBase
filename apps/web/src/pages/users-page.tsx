import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser } from "../lib/types";
import { Badge, Button, Field, Panel } from "../components/ui";
import { ErrorPanel, InlineError, LoadingPanel, toError } from "../app/shared";

export function UsersPage({ user }: { user: AuthenticatedUser }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "WAREHOUSE">("WAREHOUSE");
  const [debugInvitationUrl, setDebugInvitationUrl] = useState("");
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["users"], queryFn: rescueBaseApi.users, enabled: user.role === "ADMIN" });
  const invite = useMutation({
    mutationFn: rescueBaseApi.inviteUser,
    onSuccess: async (result) => {
      setDisplayName("");
      setEmail("");
      setRole("WAREHOUSE");
      setDebugInvitationUrl(result.debugUrl ?? result.invitationUrl);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });
  const toggle = useMutation({
    mutationFn: ({ active, id }: { active: boolean; id: string }) => rescueBaseApi.setUserActive(id, { active }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });

  if (user.role !== "ADMIN") {
    return <ErrorPanel error={new Error("Für Benutzerverwaltung ist eine Admin-Rolle erforderlich.")} onRetry={() => undefined} />;
  }
  if (users.isLoading) {
    return <LoadingPanel label="Benutzer werden geladen" />;
  }
  if (users.isError || !users.data) {
    return <ErrorPanel error={toError(users.error)} onRetry={() => void users.refetch()} />;
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Benutzer</h1>
          <p>Einladungen, Rollen und 2FA-Status der Organisation.</p>
        </div>
      </header>
      <Panel>
        <div className="panel-header">
          <div>
            <h2>Benutzer einladen</h2>
            <p>Einladungen laufen per E-Mail-Link mit eigenem Passwort-Setup.</p>
          </div>
          <Users />
        </div>
        <div className="form-grid form-grid-three">
          <Field label="Name">
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </Field>
          <Field label="E-Mail">
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Rolle">
            <select value={role} onChange={(event) => setRole(event.target.value as "ADMIN" | "WAREHOUSE")}>
              <option value="WAREHOUSE">Lagerwart</option>
              <option value="ADMIN">Admin</option>
            </select>
          </Field>
        </div>
        {invite.error ? <InlineError error={invite.error} /> : null}
        {debugInvitationUrl ? <p className="debug-hint">Lokaler Einladungslink: {debugInvitationUrl}</p> : null}
        <div className="form-actions">
          <Button disabled={!displayName.trim() || !email.trim() || invite.isPending} onClick={() => invite.mutate({ displayName, email, role })} type="button">
            <Plus data-icon="inline-start" />
            Einladung senden
          </Button>
        </div>
      </Panel>
      <Panel>
        <div className="panel-header">
          <div>
            <h2>Benutzerkonten</h2>
            <p>Aktivierung, Deaktivierung und 2FA-Status.</p>
          </div>
          <Badge tone="info">{users.data.length} Konten</Badge>
        </div>
        <div className="table">
          {users.data.map((entry) => (
            <div className="table-row user-row" key={entry.id}>
              <span>
                <strong>{entry.displayName}</strong>
                <small>{entry.email}</small>
              </span>
              <Badge tone={entry.role === "ADMIN" ? "danger" : "info"}>{entry.role === "ADMIN" ? "Admin" : "Lagerwart"}</Badge>
              <Badge tone={entry.active ? "ready" : "warning"}>{entry.active ? "Aktiv" : "Ausstehend/Inaktiv"}</Badge>
              <Badge tone={entry.twoFactorEnabled ? "ready" : "neutral"}>
                {entry.twoFactorEnabled ? `2FA ${entry.twoFactorMethod}` : "2FA aus"}
              </Badge>
              <div className="row-actions">
                <Button
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ active: !entry.active, id: entry.id })}
                  type="button"
                  variant={entry.active ? "danger" : "secondary"}
                >
                  {entry.active ? "Deaktivieren" : "Aktivieren"}
                </Button>
              </div>
            </div>
          ))}
        </div>
        {toggle.error ? <InlineError error={toggle.error} /> : null}
      </Panel>
    </>
  );
}
