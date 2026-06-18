import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthenticatedUser } from "../lib/types";
import { rescueBaseApi } from "../lib/api";
import { toError } from "../app/formatters";
import { ErrorPanel, LoadingPanel } from "../components/state-panels";
import { PageHeader, PageSection } from "../components/page-layout";
import { Badge, Button } from "../components/ui";
import { Plus } from "lucide-react";
import { AlertRecipientsPanel } from "./users/alert-recipients-panel";
import { UserInvitationPanel } from "./users/user-invitation-panel";
import { UserListPanel } from "./users/user-list-panel";

export function UsersPage({ user }: { user: AuthenticatedUser }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["users"], queryFn: rescueBaseApi.users, enabled: user.role === "ADMIN" });
  const invite = useMutation({ mutationFn: rescueBaseApi.inviteUser, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["users"] }) });
  const toggle = useMutation({ mutationFn: ({ active, id }: { active: boolean; id: string }) => rescueBaseApi.setUserActive(id, { active }), onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["users"] }) });
  const deleteUser = useMutation({ mutationFn: rescueBaseApi.deleteUser, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["users"] }) });

  if (user.role !== "ADMIN") return <ErrorPanel error={new Error("Für Benutzerverwaltung ist eine Admin-Rolle erforderlich.")} onRetry={() => undefined} />;
  if (users.isLoading) return <LoadingPanel label="Benutzer werden geladen" />;
  if (users.isError || !users.data) return <ErrorPanel error={toError(users.error)} onRetry={() => void users.refetch()} />;

  return (
    <>
      <PageHeader actions={<><Badge tone="info">{users.data.length} Konten</Badge><Button onClick={() => setInviteOpen(true)} type="button"><Plus data-icon="inline-start" />Benutzer einladen</Button></>} description="Konten, Rollen und Benachrichtigungsempfänger verwalten." title="Benutzer" />
      <UserListPanel currentUserId={user.id} error={toggle.error ?? deleteUser.error ?? null} isSubmitting={toggle.isPending || deleteUser.isPending} onDelete={(id) => deleteUser.mutate(id)} onToggle={(id, active) => toggle.mutate({ active, id })} users={users.data} />
      <PageSection description="Empfänger für operative Warnungen und Hinweise." title="Alarmempfänger"><AlertRecipientsPanel /></PageSection>
      <UserInvitationPanel error={invite.error ?? null} isOpen={inviteOpen} isSubmitting={invite.isPending} onClose={() => setInviteOpen(false)} onInvite={invite.mutateAsync} />
    </>
  );
}
