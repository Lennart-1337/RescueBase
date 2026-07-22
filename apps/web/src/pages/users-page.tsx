import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthenticatedUser } from "../lib/types";
import { rescueBaseApi } from "../lib/api";
import { toError } from "../app/formatters";
import { ErrorPanel, LoadingPanel } from "../components/state-panels";
import { PageHeader, PageSection } from "../components/page-layout";
import { Badge, Button } from "../components/ui";
import { Plus } from "lucide-react";
import { userKeys, userQueries } from "../queries/users";
import { AlertRecipientsPanel } from "./users/alert-recipients-panel";
import { UserInvitationPanel } from "./users/user-invitation-panel";
import { UserListPanel } from "./users/user-list-panel";
import { UserRoleDialog } from "./users/user-role-dialog";
import { UserProfileDialog } from "./users/user-profile-dialog";
import { UserSecurityDialog, type UserSecurityAction } from "./users/user-security-dialog";

export function UsersPage({ user }: { user: AuthenticatedUser }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleUserId, setRoleUserId] = useState("");
  const [roleDraft, setRoleDraft] = useState<"ADMIN" | "WAREHOUSE">("WAREHOUSE");
  const [profileUserId, setProfileUserId] = useState("");
  const [securityUserId, setSecurityUserId] = useState("");
  const queryClient = useQueryClient();
  const users = useQuery(userQueries.list(user.role === "ADMIN"));
  const invite = useMutation({ mutationFn: rescueBaseApi.inviteUser, onSuccess: async () => queryClient.invalidateQueries({ queryKey: userKeys.list() }) });
  const toggle = useMutation({ mutationFn: ({ active, id }: { active: boolean; id: string }) => rescueBaseApi.setUserActive(id, { active }), onSuccess: async () => queryClient.invalidateQueries({ queryKey: userKeys.list() }) });
  const updateRole = useMutation({ mutationFn: ({ id, role }: { id: string; role: "ADMIN" | "WAREHOUSE" }) => rescueBaseApi.setUserRole(id, { role }), onSuccess: async () => { setRoleUserId(""); await queryClient.invalidateQueries({ queryKey: userKeys.list() }); } });
  const deleteUser = useMutation({ mutationFn: rescueBaseApi.deleteUser, onSuccess: async () => queryClient.invalidateQueries({ queryKey: userKeys.list() }) });
  const updateProfile = useMutation({ mutationFn: ({ id, body }: { id: string; body: { displayName: string; email: string } }) => rescueBaseApi.updateUserProfile(id, body), onSuccess: async () => { setProfileUserId(""); await queryClient.invalidateQueries({ queryKey: userKeys.list() }); } });
  const resendInvitation = useMutation({ mutationFn: rescueBaseApi.resendUserInvitation, onSuccess: async () => queryClient.invalidateQueries({ queryKey: userKeys.list() }) });
  const revokeInvitation = useMutation({ mutationFn: rescueBaseApi.revokeUserInvitation, onSuccess: async () => queryClient.invalidateQueries({ queryKey: userKeys.list() }) });
  const security = useMutation({ mutationFn: ({ action, id }: { action: UserSecurityAction; id: string }) => action === "password-reset" ? rescueBaseApi.sendUserPasswordReset(id) : action === "sessions" ? rescueBaseApi.revokeUserSessions(id) : rescueBaseApi.resetUserTwoFactor(id), onSuccess: async () => { setSecurityUserId(""); await queryClient.invalidateQueries({ queryKey: userKeys.list() }); } });

  if (user.role !== "ADMIN") return <ErrorPanel error={new Error("Für Benutzerverwaltung ist eine Admin-Rolle erforderlich.")} onRetry={() => undefined} />;
  if (users.isLoading) return <LoadingPanel label="Benutzer werden geladen" />;
  if (users.isError || !users.data) return <ErrorPanel error={toError(users.error)} onRetry={() => void users.refetch()} />;
  const roleUser = users.data.find((entry) => entry.id === roleUserId) ?? null;
  const profileUser = users.data.find((entry) => entry.id === profileUserId) ?? null;
  const securityUser = users.data.find((entry) => entry.id === securityUserId) ?? null;

  return (
    <>
      <PageHeader actions={<><Badge tone="info">{users.data.length} Konten</Badge><Button onClick={() => setInviteOpen(true)} type="button"><Plus data-icon="inline-start" />Benutzer einladen</Button></>} title="Benutzer" />
      <UserListPanel currentUserId={user.id} error={toggle.error ?? updateRole.error ?? deleteUser.error ?? updateProfile.error ?? resendInvitation.error ?? revokeInvitation.error ?? security.error ?? null} isSubmitting={toggle.isPending || updateRole.isPending || deleteUser.isPending || updateProfile.isPending || resendInvitation.isPending || revokeInvitation.isPending || security.isPending} onDelete={(id) => deleteUser.mutate(id)} onEditProfile={(entry) => setProfileUserId(entry.id)} onEditRole={(entry) => { setRoleUserId(entry.id); setRoleDraft(entry.role); }} onResendInvitation={(entry) => resendInvitation.mutate(entry.id)} onRevokeInvitation={(entry) => { if (window.confirm(`Einladung für ${entry.displayName} wirklich widerrufen?`)) revokeInvitation.mutate(entry.id); }} onSecurity={(entry) => setSecurityUserId(entry.id)} onToggle={(id, active) => toggle.mutate({ active, id })} users={users.data} />
      <PageSection title="Alarmempfänger"><AlertRecipientsPanel /></PageSection>
      <UserInvitationPanel error={invite.error ?? null} isOpen={inviteOpen} isSubmitting={invite.isPending} onClose={() => setInviteOpen(false)} onInvite={invite.mutateAsync} />
      <UserRoleDialog isOpen={Boolean(roleUser)} isSubmitting={updateRole.isPending} onClose={() => setRoleUserId("")} onRoleChange={setRoleDraft} onSave={() => roleUser && updateRole.mutate({ id: roleUser.id, role: roleDraft })} role={roleDraft} user={roleUser} />
      <UserProfileDialog isOpen={Boolean(profileUser)} isSubmitting={updateProfile.isPending} onClose={() => setProfileUserId("")} onSave={(body) => profileUser && updateProfile.mutate({ id: profileUser.id, body })} user={profileUser} />
      <UserSecurityDialog isOpen={Boolean(securityUser)} isSubmitting={security.isPending} onAction={(action) => securityUser && security.mutate({ action, id: securityUser.id })} onClose={() => setSecurityUserId("")} user={securityUser} />
    </>
  );
}
