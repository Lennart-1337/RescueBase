import { Outlet, createMemoryHistory, createRootRoute, createRoute, createRouter, useParams } from "@tanstack/react-router";
import { AccountPage } from "../pages/account-page";
import { AdminDashboard } from "../pages/admin-dashboard";
import { InventoryPage } from "../pages/inventory-page";
import { KitsPage } from "../pages/kits-page";
import { MasterDataPage } from "../pages/master-data-page";
import { PublicCheck } from "../pages/public-check-page";
import { InvitationAcceptPage, PasswordResetConfirmPage, PasswordResetRequestPage } from "../pages/public-auth-pages";
import { UsersPage } from "../pages/users-page";
import { AdminAuthGate, AuthScreen } from "./auth";
import { AdminShell } from "./admin-shell";

const rootRoute = createRootRoute({ component: RootRoute });
const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: DashboardRoute });
const kitsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/admin/rucksaecke", component: KitsRoute });
const inventoryRoute = createRoute({ getParentRoute: () => rootRoute, path: "/admin/lager", component: InventoryRoute });
const masterDataRoute = createRoute({ getParentRoute: () => rootRoute, path: "/admin/stammdaten", component: MasterDataRoute });
const usersRoute = createRoute({ getParentRoute: () => rootRoute, path: "/admin/benutzer", component: UsersRoute });
const accountRoute = createRoute({ getParentRoute: () => rootRoute, path: "/admin/konto", component: AccountRoute });
const invitationRoute = createRoute({ getParentRoute: () => rootRoute, path: "/einladung/$token", component: InvitationRoute });
const passwordResetRequestRoute = createRoute({ getParentRoute: () => rootRoute, path: "/passwort-vergessen", component: PasswordResetRequestRoute });
const passwordResetConfirmRoute = createRoute({ getParentRoute: () => rootRoute, path: "/passwort-zuruecksetzen/$token", component: PasswordResetConfirmRoute });
const publicCheckRoute = createRoute({ getParentRoute: () => rootRoute, path: "/check/$token", component: PublicCheckRoute });

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  kitsRoute,
  inventoryRoute,
  masterDataRoute,
  usersRoute,
  accountRoute,
  invitationRoute,
  passwordResetRequestRoute,
  passwordResetConfirmRoute,
  publicCheckRoute
]);

export function createAppRouter(options?: { history?: Parameters<typeof createRouter>[0]["history"] }) {
  return createRouter({ routeTree, history: options?.history });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}

export function createAppMemoryRouter(pathname: string) {
  return createAppRouter({
    history: createMemoryHistory({ initialEntries: [pathname] })
  });
}

function RootRoute() {
  return <Outlet />;
}

function DashboardRoute() {
  return <AdminRoute>{() => <AdminDashboard />}</AdminRoute>;
}

function KitsRoute() {
  return <AdminRoute>{() => <KitsPage />}</AdminRoute>;
}

function InventoryRoute() {
  return <AdminRoute>{() => <InventoryPage />}</AdminRoute>;
}

function MasterDataRoute() {
  return <AdminRoute>{(user) => <MasterDataPage user={user} />}</AdminRoute>;
}

function UsersRoute() {
  return <AdminRoute>{(user) => <UsersPage user={user} />}</AdminRoute>;
}

function AccountRoute() {
  return <AdminRoute>{(user) => <AccountPage user={user} />}</AdminRoute>;
}

function InvitationRoute() {
  const { token } = useParams({ from: "/einladung/$token" });
  return (
    <AuthScreen>
      <InvitationAcceptPage token={token} />
    </AuthScreen>
  );
}

function PasswordResetRequestRoute() {
  return (
    <AuthScreen>
      <PasswordResetRequestPage />
    </AuthScreen>
  );
}

function PasswordResetConfirmRoute() {
  const { token } = useParams({ from: "/passwort-zuruecksetzen/$token" });
  return (
    <AuthScreen>
      <PasswordResetConfirmPage token={token} />
    </AuthScreen>
  );
}

function PublicCheckRoute() {
  const { token } = useParams({ from: "/check/$token" });
  return <PublicCheck token={token} />;
}

function AdminRoute({ children }: { children: (user: Parameters<typeof AdminShell>[0]["user"]) => React.ReactNode }) {
  return (
    <AdminAuthGate>
      {(user) => <AdminShell user={user}>{children(user)}</AdminShell>}
    </AdminAuthGate>
  );
}
