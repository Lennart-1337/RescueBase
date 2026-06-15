import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthenticatedUser } from "../lib/types";
import { rescueBaseApi } from "../lib/api";
import { toError } from "../app/formatters";
import { ErrorPanel, LoadingPanel } from "../components/state-panels";
import { UserInvitationPanel } from "./users/user-invitation-panel";
import { UserListPanel } from "./users/user-list-panel";

export function UsersPage({ user }: { user: AuthenticatedUser }) {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["users"], queryFn: rescueBaseApi.users, enabled: user.role === "ADMIN" });
  const invite = useMutation({
    mutationFn: rescueBaseApi.inviteUser,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["users"] })
  });
  const toggle = useMutation({
    mutationFn: ({ active, id }: { active: boolean; id: string }) => rescueBaseApi.setUserActive(id, { active }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["users"] })
  });

  if (user.role !== "ADMIN") return <ErrorPanel error={new Error("Für Benutzerverwaltung ist eine Admin-Rolle erforderlich.")} onRetry={() => undefined} />;
  if (users.isLoading) return <LoadingPanel label="Benutzer werden geladen" />;
  if (users.isError || !users.data) return <ErrorPanel error={toError(users.error)} onRetry={() => void users.refetch()} />;

  return (
    <>
      <header className="topbar"><div><h1>Benutzer</h1><p>Einladungen, Rollen und 2FA-Status der Organisation.</p></div></header>
      <UserInvitationPanel error={invite.error ?? null} isSubmitting={invite.isPending} onInvite={invite.mutateAsync} />
      <UserListPanel error={toggle.error ?? null} isSubmitting={toggle.isPending} onToggle={(id, active) => toggle.mutate({ active, id })} users={users.data} />
    </>
  );
}
