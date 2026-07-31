import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, Send, ShieldX, Trash2, UserRoundCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { formatDateTime, toError } from "../app/formatters";
import { PageHeader } from "../components/page-layout";
import { Button, Tabs } from "../components/ui";
import { ErrorPanel, LoadingPanel } from "../components/state-panels";
import { ListPagination } from "../components/list-pagination";
import { DataTable, type DataTableSort, sortDataTableRows } from "../components/data-table/data-table";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser, UserSummary } from "../lib/types";
import { userKeys, userQueries } from "../queries/users";
import { UserInvitationPanel } from "./users/user-invitation-panel";
import { UserProfileDialog } from "./users/user-profile-dialog";
import { UserSecurityDialog, type UserSecurityAction } from "./users/user-security-dialog";
import { formatUserRole } from "./users/user-role";
import { formatInvitationStatus } from "./users/user-status";
import { slideUpVariants } from "../motion/presets";
import { useMotionMode } from "../motion/use-motion-mode";
import "./user-management-page.css";

export function UserManagementPage({ user }: { user: AuthenticatedUser }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sort, setSort] = useState<DataTableSort>(null);
  const [visibleColumns, setVisibleColumns] = useState(["user", "role", "status", "verified", "twoFactor", "lastLogin"]);
  const [detailTab, setDetailTab] = useState("profile");
  const motionMode = useMotionMode();
  const queryClient = useQueryClient();
  const users = useQuery(userQueries.list(user.role === "ADMIN"));
  const refresh = async () => queryClient.invalidateQueries({ queryKey: userKeys.list() });
  const invite = useMutation({ mutationFn: rescueBaseApi.inviteUser, onSuccess: refresh });
  const toggle = useMutation({ mutationFn: ({ active, id }: { active: boolean; id: string }) => rescueBaseApi.setUserActive(id, { active }), onSuccess: refresh });
  const deleteUser = useMutation({ mutationFn: rescueBaseApi.deleteUser, onSuccess: refresh });
  const resendInvitation = useMutation({ mutationFn: rescueBaseApi.resendUserInvitation, onSuccess: refresh });
  const revokeInvitation = useMutation({ mutationFn: rescueBaseApi.revokeUserInvitation, onSuccess: refresh });
  const update = useMutation({ mutationFn: ({ id, body, role }: { id: string; body: { displayName: string; email: string }; role: "ADMIN" | "WAREHOUSE" | null }) => Promise.all([rescueBaseApi.updateUserProfile(id, body), ...(role ? [rescueBaseApi.setUserRole(id, { role })] : [])]), onSuccess: async () => { setProfileOpen(false); await refresh(); } });
  const security = useMutation({ mutationFn: ({ action, id }: { action: UserSecurityAction; id: string }) => action === "password-reset" ? rescueBaseApi.sendUserPasswordReset(id) : action === "sessions" ? rescueBaseApi.revokeUserSessions(id) : rescueBaseApi.resetUserTwoFactor(id), onSuccess: async () => { setSecurityOpen(false); await refresh(); } });
  const bulk = useMutation({ mutationFn: ({ action, ids }: { action: "deactivate" | "sessions"; ids: string[] }) => Promise.all(ids.map((id) => action === "deactivate" ? rescueBaseApi.setUserActive(id, { active: false }) : rescueBaseApi.revokeUserSessions(id))), onSuccess: async () => { setSelectedIds([]); await refresh(); } });
  const visibleUsers = useMemo(() => users.data?.filter((entry) => `${entry.displayName} ${entry.email}`.toLocaleLowerCase("de").includes(filter.toLocaleLowerCase("de"))) ?? [], [filter, users.data]);
  const columns = [{ id: "user", label: "Benutzer", render: (entry: UserSummary) => <><strong>{entry.displayName}</strong><small>{entry.email}</small></>, sortValue: (entry: UserSummary) => entry.displayName }, { id: "role", label: "Rolle", render: (entry: UserSummary) => formatUserRole(entry.role), sortValue: (entry: UserSummary) => formatUserRole(entry.role), width: "110px" }, { id: "status", label: "Status", render: (entry: UserSummary) => <span className={entry.active ? "status-ready" : "status-warning"}>{formatUserStatus(entry)}</span>, sortValue: (entry: UserSummary) => formatUserStatus(entry), width: "140px" }, { id: "verified", label: "E-Mail", render: (entry: UserSummary) => <span className={entry.emailVerified ? "status-ready" : "status-warning"}>{entry.emailVerified ? "Bestätigt" : "Offen"}</span>, sortValue: (entry: UserSummary) => entry.emailVerified ? 1 : 0, width: "120px" }, { id: "twoFactor", label: "2FA", render: (entry: UserSummary) => formatTwoFactor(entry), sortValue: (entry: UserSummary) => entry.twoFactorEnabled ? 1 : 0, width: "130px" }, { id: "lastLogin", label: "Letzte Anmeldung", render: (entry: UserSummary) => formatLastLogin(entry.lastLoginAt), sortValue: (entry: UserSummary) => entry.lastLoginAt ?? "", width: "165px" }];
  const sortedUsers = useMemo(() => sortDataTableRows(visibleUsers, columns, sort), [sort, visibleUsers]);
  const pageCount = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedUsers = sortedUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = sortedUsers.find((entry) => entry.id === selectedId) ?? sortedUsers[0] ?? null;
  const selectedOtherIds = selectedIds.filter((id) => id !== user.id);

  if (user.role !== "ADMIN") return <ErrorPanel error={new Error("Für Benutzerverwaltung ist eine Admin-Rolle erforderlich.")} onRetry={() => undefined} />;
  if (users.isLoading) return <LoadingPanel label="Benutzer werden geladen" />;
  if (users.isError || !users.data) return <ErrorPanel error={toError(users.error)} onRetry={() => void users.refetch()} />;

  return <>
    <PageHeader actions={<Button onClick={() => setInviteOpen(true)} type="button"><Plus data-icon="inline-start" />Benutzer einladen</Button>} description="Konten, Einladungen und Zugänge an einer Stelle steuern." title="Benutzerverwaltung" />
    <div className="user-management-layout">
      <section aria-labelledby="accounts-heading" className="user-management-accounts">
        <header className="user-management-section-header"><div><h2 id="accounts-heading">Konten</h2><p>{users.data.length} Benutzerkonten</p></div><label className="user-management-search">Suchen<input aria-label="Konten suchen" onChange={(event) => { setFilter(event.target.value); setPage(1); }} placeholder="Name oder E-Mail" value={filter} /></label></header>
        <div className="user-management-roster"><DataTable columns={columns} getRowId={(entry) => entry.id} onRowClick={(entry) => setSelectedId(entry.id)} onSelectionChange={setSelectedIds} onSortChange={setSort} onVisibleColumnsChange={setVisibleColumns} rows={pagedUsers} selectedIds={selectedIds} selectedRowId={selected?.id} sort={sort} toolbar={<BulkSelectionActions canDeactivate={selectedOtherIds.length > 0} isPending={bulk.isPending} motionMode={motionMode} onDeactivate={() => bulk.mutate({ action: "deactivate", ids: selectedOtherIds })} onRevokeSessions={() => bulk.mutate({ action: "sessions", ids: selectedIds })} selectedCount={selectedIds.length} />} visibleColumns={visibleColumns} />{visibleUsers.length === 0 ? <p className="user-management-empty">Keine Benutzerkonten gefunden.</p> : null}<ListPagination label="Benutzerseiten" onPageChange={setPage} onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(1); }} page={currentPage} pageSize={pageSize} pageSizeOptions={[10, 25, 50]} total={visibleUsers.length} /></div>
      </section>
      <AccountStatus users={users.data} />
      <AccountDetails currentUserId={user.id} detailTab={detailTab} isSubmitting={toggle.isPending || update.isPending || security.isPending || deleteUser.isPending || resendInvitation.isPending || revokeInvitation.isPending} onDelete={() => selected && deleteUser.mutate(selected.id)} onEdit={() => setProfileOpen(true)} onResendInvitation={() => selected && resendInvitation.mutate(selected.id)} onRevokeInvitation={() => selected && revokeInvitation.mutate(selected.id)} onSecurity={() => setSecurityOpen(true)} onTabChange={setDetailTab} onToggle={() => selected && toggle.mutate({ id: selected.id, active: !selected.active })} selected={selected} />
    </div>
    <UserInvitationPanel error={invite.error ?? null} isOpen={inviteOpen} isSubmitting={invite.isPending} onClose={() => setInviteOpen(false)} onInvite={invite.mutateAsync} />
    <UserProfileDialog isOpen={profileOpen} isSubmitting={update.isPending} onClose={() => setProfileOpen(false)} onSave={(body) => selected && update.mutate({ id: selected.id, body, role: body.role === selected.role ? null : body.role })} user={selected} />
    <UserSecurityDialog isOpen={securityOpen} isSubmitting={security.isPending} onAction={(action) => selected && security.mutate({ action, id: selected.id })} onClose={() => setSecurityOpen(false)} user={selected} />
  </>;
}

function BulkSelectionActions({ canDeactivate, isPending, motionMode, onDeactivate, onRevokeSessions, selectedCount }: { canDeactivate: boolean; isPending: boolean; motionMode: "full" | "reduced"; onDeactivate: () => void; onRevokeSessions: () => void; selectedCount: number }) {
  return <AnimatePresence initial={false}>{selectedCount > 0 ? <motion.div animate="visible" className="user-management-bulk" data-motion-mode={motionMode} exit="exit" initial="hidden" key="bulk-actions" variants={slideUpVariants(motionMode)}><span>{selectedCount} ausgewählt</span><Button disabled={isPending} onClick={onRevokeSessions} type="button" variant="secondary">Sitzungen widerrufen</Button><Button disabled={isPending || !canDeactivate} onClick={onDeactivate} type="button" variant="danger">Konten deaktivieren</Button></motion.div> : null}</AnimatePresence>;
}

function AccountStatus({ users }: { users: UserSummary[] }) {
  const invitations = users.filter((entry) => entry.invitationStatus === "OPEN").length;
  const inactive = users.filter((entry) => !entry.active).length;
  const withoutTwoFactor = users.filter((entry) => entry.active && !entry.twoFactorEnabled).length;
  return <aside aria-label="Kontostatus" className="user-management-status"><dl><div><dt>Einladungen offen</dt><dd>{invitations}</dd></div><div><dt>Deaktivierte Konten</dt><dd>{inactive}</dd></div><div><dt>Aktiv ohne 2FA</dt><dd>{withoutTwoFactor}</dd></div></dl></aside>;
}

function AccountDetails(props: { currentUserId: string; detailTab: string; isSubmitting: boolean; onDelete: () => void; onEdit: () => void; onResendInvitation: () => void; onRevokeInvitation: () => void; onSecurity: () => void; onTabChange: (value: string) => void; onToggle: () => void; selected: UserSummary | null }) {
  const { selected } = props;
  const confirmDelete = () => selected && window.confirm(`Benutzerkonto „${selected.displayName}“ wirklich löschen?`) && props.onDelete();
  const confirmRevoke = () => selected && window.confirm(`Einladung für ${selected.displayName} wirklich widerrufen?`) && props.onRevokeInvitation();
  return <section aria-labelledby="details-heading" className="user-management-details"><header><div><h2 id="details-heading">Kontodetails</h2><p>{selected ? `${selected.displayName} · ${selected.email}` : "Benutzerkonto auswählen"}</p></div>{selected ? <UserRoundCheck /> : null}</header>{selected ? <><Tabs items={[{ label: "Profil", value: "profile" }, { label: "Zugang", value: "access" }, { label: "Sicherheit", value: "security" }]} label="Kontodetails" onChange={props.onTabChange} value={props.detailTab} /><DetailContent tab={props.detailTab} user={selected} /><AccountActions canManage={selected.id !== props.currentUserId} confirmDelete={confirmDelete} confirmRevoke={confirmRevoke} detailTab={props.detailTab} isSubmitting={props.isSubmitting} onEdit={props.onEdit} onResendInvitation={props.onResendInvitation} onSecurity={props.onSecurity} onToggle={props.onToggle} selected={selected} /></> : null}</section>;
}

function AccountActions(props: { canManage: boolean; confirmDelete: () => void; confirmRevoke: () => void; detailTab: string; isSubmitting: boolean; onEdit: () => void; onResendInvitation: () => void; onSecurity: () => void; onToggle: () => void; selected: UserSummary }) {
  if (!props.canManage) return null;
  if (props.detailTab === "profile") return <div className="user-management-actions"><Button disabled={props.isSubmitting} onClick={props.onEdit} type="button" variant="secondary">Profil bearbeiten</Button></div>;
  if (props.detailTab === "security") return <div className="user-management-actions"><Button disabled={props.isSubmitting} onClick={props.onSecurity} type="button" variant="secondary"><KeyRound data-icon="inline-start" />Sicherheit verwalten</Button></div>;
  const canResend = props.selected.invitationStatus === "OPEN" || props.selected.invitationStatus === "EXPIRED" || props.selected.invitationStatus === "REVOKED";
  return <div className="user-management-actions"><Button disabled={props.isSubmitting} onClick={props.onToggle} type="button" variant={props.selected.active ? "danger" : "secondary"}>{props.selected.active ? "Konto deaktivieren" : "Konto aktivieren"}</Button>{canResend ? <Button disabled={props.isSubmitting} onClick={props.onResendInvitation} type="button" variant="secondary"><Send data-icon="inline-start" />Einladung senden</Button> : null}{props.selected.invitationStatus === "OPEN" ? <Button disabled={props.isSubmitting} onClick={props.confirmRevoke} type="button" variant="secondary"><ShieldX data-icon="inline-start" />Einladung widerrufen</Button> : null}<Button disabled={props.isSubmitting} onClick={props.confirmDelete} type="button" variant="danger"><Trash2 data-icon="inline-start" />Konto löschen</Button></div>;
}

function DetailContent({ tab, user }: { tab: string; user: UserSummary }) {
  if (tab === "access") return <dl className="user-management-definition"><div><dt>Status</dt><dd>{formatUserStatus(user)}</dd></div><div><dt>E-Mail-Verifikation</dt><dd>{user.emailVerified ? "Bestätigt" : "Ausstehend"}</dd></div><div><dt>Letzte Anmeldung</dt><dd>{formatLastLogin(user.lastLoginAt)}</dd></div><div><dt>Aktive Sitzungen</dt><dd>{user.sessionCount}</dd></div><div><dt>Einladung</dt><dd>{formatInvitationStatus(user.invitationStatus) ?? "Keine ausstehende Einladung"}</dd></div></dl>;
  if (tab === "security") return <dl className="user-management-definition"><div><dt>Zwei-Faktor-Authentifizierung</dt><dd>{formatTwoFactor(user)}</dd></div><div><dt>Aktive Sitzungen</dt><dd>{user.sessionCount}</dd></div></dl>;
  return <dl className="user-management-definition"><div><dt>Name</dt><dd>{user.displayName}</dd></div><div><dt>E-Mail</dt><dd>{user.email}</dd></div><div><dt>E-Mail-Verifikation</dt><dd>{user.emailVerified ? "Bestätigt" : "Ausstehend"}</dd></div><div><dt>Rolle</dt><dd>{formatUserRole(user.role)}</dd></div></dl>;
}

function formatUserStatus(user: UserSummary) {
  return formatInvitationStatus(user.invitationStatus) ?? (user.active ? "Aktiv" : "Deaktiviert");
}

function formatTwoFactor(user: UserSummary) {
  if (!user.twoFactorEnabled) return "Nicht eingerichtet";
  return user.twoFactorMethod === "TOTP" ? "TOTP-App" : "E-Mail-OTP";
}

function formatLastLogin(value: UserSummary["lastLoginAt"]) {
  return value ? formatDateTime(value) : "Noch nie";
}
