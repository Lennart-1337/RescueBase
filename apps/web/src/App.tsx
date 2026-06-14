import { useEffect, useMemo, useRef, useState } from "react";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useParams
} from "@tanstack/react-router";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  FileText,
  History,
  KeyRound,
  Layers3,
  LogOut,
  MapPin,
  Mail,
  Minus,
  Pencil,
  PackageCheck,
  Plus,
  QrCode,
  RotateCw,
  Save,
  Settings,
  ShieldCheck,
  Users,
  Truck,
  X
} from "lucide-react";
import QRCode from "qrcode";
import { rescueBaseApi } from "./lib/api";
import { groupTemplatePositions, initialCheckLines, summarizeCheck, type CheckLineState } from "./lib/check";
import type {
  Batch,
  AuthenticatedUser,
  Article,
  InventoryMovement,
  KitOperationalStatus,
  KitTemplate,
  Location,
  PublicKitResponse,
  ReplenishmentOrder
} from "./lib/types";
import { AnchorButton, Badge, Button, Field, Panel, cn } from "./components/ui";
import "./styles.css";

const statusLabels: Record<KitOperationalStatus, string> = {
  READY: "Bereit",
  CONDITIONAL: "Bedingt einsatzbereit",
  NOT_READY: "Nicht einsatzbereit"
};

const rootRoute = createRootRoute({ component: RootRoute });
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardRoute
});
const kitsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/rucksaecke",
  component: KitsRoute
});
const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/lager",
  component: InventoryRoute
});
const masterDataRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/stammdaten",
  component: MasterDataRoute
});
const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/benutzer",
  component: UsersRoute
});
const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/konto",
  component: AccountRoute
});
const invitationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/einladung/$token",
  component: InvitationRoute
});
const passwordResetRequestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/passwort-vergessen",
  component: PasswordResetRequestRoute
});
const passwordResetConfirmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/passwort-zuruecksetzen/$token",
  component: PasswordResetConfirmRoute
});
const publicCheckRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/check/$token",
  component: PublicCheckRoute
});

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

function createAppRouter() {
  return createRouter({ routeTree });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}

export default function App() {
  const [router] = useState(createAppRouter);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 5_000
          },
          mutations: {
            retry: false
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

function RootRoute() {
  return <Outlet />;
}

function DashboardRoute() {
  return (
    <AdminAuthGate>
      {(user) => (
        <AdminShell user={user}>
          <AdminDashboard />
        </AdminShell>
      )}
    </AdminAuthGate>
  );
}

function KitsRoute() {
  return (
    <AdminAuthGate>
      {(user) => (
        <AdminShell user={user}>
          <KitsPage />
        </AdminShell>
      )}
    </AdminAuthGate>
  );
}

function InventoryRoute() {
  return (
    <AdminAuthGate>
      {(user) => (
        <AdminShell user={user}>
          <InventoryPage />
        </AdminShell>
      )}
    </AdminAuthGate>
  );
}

function MasterDataRoute() {
  return (
    <AdminAuthGate>
      {(user) => (
        <AdminShell user={user}>
          <MasterDataPage user={user} />
        </AdminShell>
      )}
    </AdminAuthGate>
  );
}

function UsersRoute() {
  return (
    <AdminAuthGate>
      {(user) => (
        <AdminShell user={user}>
          <UsersPage user={user} />
        </AdminShell>
      )}
    </AdminAuthGate>
  );
}

function AccountRoute() {
  return (
    <AdminAuthGate>
      {(user) => (
        <AdminShell user={user}>
          <AccountPage user={user} />
        </AdminShell>
      )}
    </AdminAuthGate>
  );
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

function AdminAuthGate({ children }: { children: (user: AuthenticatedUser) => React.ReactNode }) {
  const queryClient = useQueryClient();
  const setup = useQuery({ queryKey: ["setup-status"], queryFn: rescueBaseApi.setupStatus });
  const session = useQuery({
    queryKey: ["session"],
    queryFn: rescueBaseApi.session,
    enabled: setup.data?.initialized === true
  });

  if (setup.isLoading || (setup.data?.initialized && session.isLoading)) {
    return <LoadingPanel label="RescueBase wird geladen" />;
  }
  if (setup.isError) {
    return <ErrorPanel error={toError(setup.error)} onRetry={() => void setup.refetch()} />;
  }
  if (setup.data && !setup.data.initialized) {
    return (
      <AuthScreen>
        <SetupForm onDone={() => void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["setup-status"] }),
          queryClient.invalidateQueries({ queryKey: ["session"] })
        ])} />
      </AuthScreen>
    );
  }
  if (session.isError || !session.data?.user) {
    return (
      <AuthScreen>
        <LoginForm
          firstAdminEmail={setup.data?.firstAdminEmail}
          onDone={() => void queryClient.invalidateQueries({ queryKey: ["session"] })}
        />
      </AuthScreen>
    );
  }
  return children(session.data.user);
}

function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-screen">
      <section className="auth-brand">
        <div className="brand-mark">RB</div>
        <h1>RescueBase</h1>
        <p>Sanitätslager, Rucksackchecks und Nachfüllaufträge.</p>
      </section>
      {children}
    </main>
  );
}

function SetupForm({ onDone }: { onDone: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({ mutationFn: rescueBaseApi.createFirstAdmin, onSuccess: onDone });
  const canSubmit = displayName.trim().length > 0 && email.trim().length > 3 && password.length >= 12;

  return (
    <Panel className="auth-panel">
      <div className="panel-header">
        <div>
          <h2>Erstadmin einrichten</h2>
          <p>Dieses Konto verwaltet Benutzer, Lager und Rucksackvorlagen.</p>
        </div>
        <ShieldCheck />
      </div>
      <div className="auth-form">
        <Field label="Name">
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </Field>
        <Field label="E-Mail">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Passwort">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <p className="form-hint">Mindestens 12 Zeichen.</p>
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate({ displayName, email, password })}
          type="button"
        >
          Erstadmin erstellen
        </Button>
      </div>
    </Panel>
  );
}

function LoginForm({ firstAdminEmail, onDone }: { firstAdminEmail?: string; onDone: () => void }) {
  const [email, setEmail] = useState(firstAdminEmail ?? "");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [emailChallengeId, setEmailChallengeId] = useState("");
  const [twoFactorMethod, setTwoFactorMethod] = useState<"TOTP" | "EMAIL" | "">("");
  const [debugCode, setDebugCode] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const mutation = useMutation({
    mutationFn: rescueBaseApi.login,
    onSuccess: (result) => {
      if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setTwoFactorMethod(result.twoFactorMethod ?? "");
        setEmailChallengeId(result.emailChallengeId ?? "");
        setDebugCode(result.debugCode ?? "");
        return;
      }
      setRequiresTwoFactor(false);
      setTwoFactorMethod("");
      setEmailChallengeId("");
      setDebugCode("");
      onDone();
    }
  });
  const canSubmit = email.trim().length > 3 && password.length > 0 && (!requiresTwoFactor || twoFactorCode.trim().length >= 6);

  return (
    <Panel className="auth-panel">
      <div className="panel-header">
        <div>
          <h2>Anmelden</h2>
          <p>Admin- und Lagerzugang für RescueBase.</p>
        </div>
        <ShieldCheck />
      </div>
      <div className="auth-form">
        <Field label="E-Mail">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Passwort">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {requiresTwoFactor ? (
          <Field label="2FA-Code">
            <input inputMode="numeric" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} />
          </Field>
        ) : null}
        {requiresTwoFactor ? (
          <p className="form-hint">
            {twoFactorMethod === "EMAIL" ? "Der Sicherheitscode wurde per E-Mail versendet." : "Bitte geben Sie den TOTP-Code aus Ihrer Authenticator-App ein."}
          </p>
        ) : null}
        {debugCode ? <p className="debug-hint">Lokaler Testcode: {debugCode}</p> : null}
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate({
            email,
            password,
            twoFactorCode: twoFactorCode || undefined,
            emailChallengeId: emailChallengeId || undefined
          })}
          type="button"
        >
          Anmelden
        </Button>
        <Link className="text-link" to="/passwort-vergessen">
          Passwort vergessen
        </Link>
      </div>
    </Panel>
  );
}

function AdminShell({ children, user }: { children: React.ReactNode; user: AuthenticatedUser }) {
  const queryClient = useQueryClient();
  const logout = useMutation({
    mutationFn: rescueBaseApi.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">RB</div>
          <div>
            <strong>RescueBase</strong>
            <span>Sanitätslager</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Hauptnavigation">
          <Link to="/" activeProps={{ className: "active" }} activeOptions={{ exact: true }}>
            <ClipboardList />
            Aufträge
          </Link>
          <Link to="/admin/rucksaecke" activeProps={{ className: "active" }}>
            <PackageCheck />
            Rucksäcke
          </Link>
          <Link to="/admin/lager" activeProps={{ className: "active" }}>
            <Archive />
            Lager
          </Link>
          {user.role === "ADMIN" ? (
            <Link to="/admin/stammdaten" activeProps={{ className: "active" }}>
              <Settings />
              Stammdaten
            </Link>
          ) : null}
          {user.role === "ADMIN" ? (
            <Link to="/admin/benutzer" activeProps={{ className: "active" }}>
              <Users />
              Benutzer
            </Link>
          ) : null}
          <Link to="/admin/konto" activeProps={{ className: "active" }}>
            <ShieldCheck />
            Sicherheit
          </Link>
        </nav>
        <div className="sidebar-user">
          <span>{user.displayName}</span>
          <small>{user.role === "ADMIN" ? "Admin" : "Lagerwart"}</small>
          <Button variant="ghost" onClick={() => logout.mutate()} type="button">
            <LogOut data-icon="inline-start" />
            Abmelden
          </Button>
        </div>
      </aside>
      <main className="dashboard">{children}</main>
    </div>
  );
}

function AdminDashboard() {
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const queryClient = useQueryClient();
  const dashboard = useDashboardData();

  useEffect(() => {
    if (!dashboard.data?.orders.length) {
      setSelectedOrderId("");
      return;
    }
    const firstOrder = dashboard.data.orders[0];
    if (firstOrder && !dashboard.data.orders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(firstOrder.id);
    }
  }, [dashboard.data?.orders, selectedOrderId]);

  const fulfillMutation = useMutation({
    mutationFn: ({ orderId, items }: { orderId: string; items: Array<{ itemId: string; batchId: string; quantity: number }> }) =>
      rescueBaseApi.fulfillOrder(orderId, { items }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["kits"] }),
        queryClient.invalidateQueries({ queryKey: ["batches"] })
      ]);
    }
  });

  if (dashboard.isLoading) {
    return <LoadingPanel label="Dashboard wird geladen" />;
  }
  if (dashboard.isError) {
    return <ErrorPanel error={toError(dashboard.error)} onRetry={() => void dashboard.refetch()} />;
  }
  if (!dashboard.data) {
    return <LoadingPanel label="Dashboard wird geladen" />;
  }

  const { batches, kits, orders } = dashboard.data;
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0];
  const openOrders = orders.filter((order) => order.status !== "DONE" && order.status !== "CANCELLED").length;
  const expiringBatches = batches.filter((batch) => daysUntil(batch.expiresAt) <= 90).length;
  const stockTotal = batches.reduce((sum, batch) => sum + batch.quantity, 0);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Nachfüllzentrale</h1>
          <p>Offene Mängel, chargengenaue Teilfüllungen und Ablaufwarnungen.</p>
        </div>
        <div className="topbar-actions">
          <AnchorButton variant="secondary" href={rescueBaseApi.reportUrl("/reports/csv/replenishment")}>
            <Download data-icon="inline-start" />
            CSV Aufträge
          </AnchorButton>
        </div>
      </header>

      <section className="metric-grid" aria-label="Kennzahlen">
        <Metric icon={<ClipboardList />} label="Offene Aufträge" value={String(openOrders)} tone="warning" />
        <Metric
          icon={<PackageCheck />}
          label="Rucksäcke bereit"
          value={`${kits.filter((kit) => kit.status === "READY").length}/${kits.length}`}
          tone="ready"
        />
        <Metric icon={<AlertTriangle />} label="Ablaufwarnungen" value={String(expiringBatches)} tone="danger" />
        <Metric icon={<Archive />} label="Bestand gesamt" value={String(stockTotal)} tone="info" />
      </section>

      <section className="workbench">
        <Panel className="orders-panel">
          <div className="panel-header">
            <div>
              <h2>Nachfüllaufträge</h2>
              <p>Teilfüllungen buchen konkrete Chargen aus dem Lager.</p>
            </div>
            <Badge tone="warning">{openOrders} offen</Badge>
          </div>
          {orders.length > 0 ? (
            <div className="order-list">
              {orders.map((order) => (
                <button
                  className={cn("order-row", selectedOrder?.id === order.id && "selected")}
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  type="button"
                >
                  <span>
                    <strong>{order.kit?.name ?? order.kitId}</strong>
                    <small>{order.items.length} Positionen · {formatStatus(order.status)}</small>
                  </span>
                  <Badge tone={order.status === "OPEN" ? "warning" : order.status === "DONE" ? "ready" : "info"}>
                    {formatStatus(order.status)}
                  </Badge>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="Keine Nachfüllaufträge" text="Aktuell gibt es keine offenen Nachfüllbedarfe." />
          )}
        </Panel>

        <Panel className="detail-panel">
          {selectedOrder ? (
            <OrderDetail
              batches={batches}
              error={fulfillMutation.error}
              isSubmitting={fulfillMutation.isPending}
              order={selectedOrder}
              onFulfill={(items) => fulfillMutation.mutate({ orderId: selectedOrder.id, items })}
            />
          ) : (
            <EmptyState title="Kein Auftrag ausgewählt" text="Sobald ein Auftrag existiert, kann er hier gebucht werden." />
          )}
        </Panel>
      </section>
    </>
  );
}

function KitsPage() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [locationId, setLocationId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const kits = useQuery({ queryKey: ["kits"], queryFn: rescueBaseApi.kits });
  const locations = useQuery({ queryKey: ["locations"], queryFn: rescueBaseApi.locations });
  const templates = useQuery({ queryKey: ["templates"], queryFn: rescueBaseApi.templates });
  const createMutation = useMutation({
    mutationFn: rescueBaseApi.createKit,
    onSuccess: async () => {
      setName("");
      setCode("");
      await queryClient.invalidateQueries({ queryKey: ["kits"] });
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; code: string; locationId: string; templateId: string } }) =>
      rescueBaseApi.updateKit(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["kits"] });
    }
  });
  const rotateMutation = useMutation({
    mutationFn: rescueBaseApi.rotateKitToken,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["kits"] });
    }
  });
  const selectedLocationId = locationId || locations.data?.[0]?.id || "";
  const selectedTemplateId = templateId || templates.data?.[0]?.id || "";
  const canSubmit = Boolean(name.trim() && code.trim() && selectedLocationId && selectedTemplateId);

  function resetForm() {
    setEditingId(null);
    setName("");
    setCode("");
    setLocationId("");
    setTemplateId("");
  }

  if (kits.isLoading || locations.isLoading || templates.isLoading) {
    return <LoadingPanel label="Rucksäcke werden geladen" />;
  }
  if (kits.isError || locations.isError || templates.isError) {
    return <ErrorPanel error={toError(kits.error ?? locations.error ?? templates.error)} onRetry={() => void Promise.all([kits.refetch(), locations.refetch(), templates.refetch()])} />;
  }
  if (!kits.data || !locations.data || !templates.data) {
    return <LoadingPanel label="Rucksäcke werden geladen" />;
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Rucksäcke</h1>
          <p>QR/NFC-Zugänge und Einsatzstatus pro physischem Rucksack.</p>
        </div>
      </header>
      <Panel>
        <div className="panel-header">
          <div>
            <h2>{editingId ? "Rucksack bearbeiten" : "Rucksack anlegen"}</h2>
            <p>{editingId ? "Name, Code, Standort und Vorlagenzuordnung lassen sich nachpflegen." : "Neue Rucksäcke erhalten automatisch einen geheimen QR/NFC-Link."}</p>
          </div>
          <PackageCheck />
        </div>
        <div className="form-grid form-grid-four">
          <Field label="Name">
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Code">
            <input value={code} onChange={(event) => setCode(event.target.value)} />
          </Field>
          <Field label="Standort">
            <select value={selectedLocationId} onChange={(event) => setLocationId(event.target.value)}>
              {locations.data.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Vorlage">
            <select value={selectedTemplateId} onChange={(event) => setTemplateId(event.target.value)}>
              {templates.data.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} v{template.version}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {createMutation.error ? <InlineError error={createMutation.error} /> : null}
        {updateMutation.error ? <InlineError error={toError(updateMutation.error)} /> : null}
        <div className="form-actions">
          <Button
            disabled={!canSubmit || createMutation.isPending || updateMutation.isPending}
            onClick={() => {
              if (editingId) {
                updateMutation.mutate({ id: editingId, body: { name, code, locationId: selectedLocationId, templateId: selectedTemplateId } });
              } else {
                createMutation.mutate({ name, code, locationId: selectedLocationId, templateId: selectedTemplateId });
              }
              resetForm();
            }}
            type="button"
          >
            {editingId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
            {editingId ? "Rucksack speichern" : "Rucksack anlegen"}
          </Button>
          {editingId ? (
            <Button onClick={resetForm} type="button" variant="ghost">
              <X data-icon="inline-start" />
              Abbrechen
            </Button>
          ) : null}
        </div>
      </Panel>
      <Panel>
        <div className="table">
          {kits.data.map((kit) => (
            <div className="table-row kit-row" key={kit.id}>
              <span>
                <strong>{kit.name}</strong>
                <small>{kit.code} · {kit.location?.name}</small>
              </span>
              <Badge tone={kit.status === "READY" ? "ready" : kit.status === "CONDITIONAL" ? "warning" : "danger"}>
                {statusLabels[kit.status]}
              </Badge>
              <div className="row-actions">
                <AnchorButton variant="secondary" href={rescueBaseApi.reportUrl(`/reports/qr-label/${kit.id}.pdf?format=a4`)}>
                  <QrCode data-icon="inline-start" />
                  A4-PDF
                </AnchorButton>
                <AnchorButton variant="secondary" href={rescueBaseApi.reportUrl(`/reports/qr-label/${kit.id}.pdf?format=label`)}>
                  <QrCode data-icon="inline-start" />
                  Etikett
                </AnchorButton>
                <Link className="button button-secondary" to="/check/$token" params={{ token: kit.publicToken }}>
                  <ExternalLink data-icon="inline-start" />
                  Check öffnen
                </Link>
                <Button
                  onClick={() => {
                    setEditingId(kit.id);
                    setName(kit.name);
                    setCode(kit.code);
                    setLocationId(kit.locationId);
                    setTemplateId(kit.templateId);
                  }}
                  type="button"
                  variant="ghost"
                >
                  <Pencil data-icon="inline-start" />
                  Bearbeiten
                </Button>
                <Button
                  disabled={rotateMutation.isPending}
                  onClick={() => rotateMutation.mutate(kit.id)}
                  type="button"
                  variant="ghost"
                >
                  <RotateCw data-icon="inline-start" />
                  Rotieren
                </Button>
              </div>
            </div>
          ))}
        </div>
        {rotateMutation.error ? <InlineError error={rotateMutation.error} /> : null}
      </Panel>
    </>
  );
}

function InventoryPage() {
  const [articleId, setArticleId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [correctionQuantity, setCorrectionQuantity] = useState(0);
  const [correctionLotNumber, setCorrectionLotNumber] = useState("");
  const [correctionExpiresAt, setCorrectionExpiresAt] = useState("");
  const [correctionLocationId, setCorrectionLocationId] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const queryClient = useQueryClient();
  const batches = useQuery({ queryKey: ["batches"], queryFn: rescueBaseApi.batches });
  const articles = useQuery({ queryKey: ["articles"], queryFn: rescueBaseApi.articles });
  const locations = useQuery({ queryKey: ["locations"], queryFn: rescueBaseApi.locations });
  const movements = useQuery({
    queryKey: ["batch-movements", selectedBatchId],
    queryFn: () => rescueBaseApi.batchMovements(selectedBatchId ?? ""),
    enabled: Boolean(selectedBatchId)
  });
  const createMutation = useMutation({
    mutationFn: rescueBaseApi.createBatch,
    onSuccess: async () => {
      setLotNumber("");
      setExpiresAt("");
      setQuantity(0);
      await queryClient.invalidateQueries({ queryKey: ["batches"] });
    }
  });
  const correctionMutation = useMutation({
    mutationFn: ({
      id,
      body
    }: {
      id: string;
      body: { reason: string; quantity?: number; lotNumber?: string; expiresAt?: string; locationId?: string };
    }) => rescueBaseApi.correctBatch(id, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batches"] }),
        queryClient.invalidateQueries({ queryKey: ["batch-movements", selectedBatchId] })
      ]);
      setCorrectionReason("");
    }
  });
  const selectedArticleId = articleId || articles.data?.[0]?.id || "";
  const selectedLocationId = locationId || locations.data?.[0]?.id || "";
  const canCreate = Boolean(selectedArticleId && selectedLocationId && lotNumber.trim() && expiresAt && quantity >= 0);
  const selectedBatch = batches.data?.find((batch) => batch.id === selectedBatchId) ?? null;
  const hasCorrectionChanges = Boolean(
    selectedBatch && (
      correctionQuantity !== selectedBatch.quantity ||
      correctionLotNumber.trim() !== selectedBatch.lotNumber ||
      correctionExpiresAt !== selectedBatch.expiresAt ||
      correctionLocationId !== selectedBatch.locationId
    )
  );

  useEffect(() => {
    if (!selectedBatch) {
      return;
    }
    setCorrectionQuantity(selectedBatch.quantity);
    setCorrectionLotNumber(selectedBatch.lotNumber);
    setCorrectionExpiresAt(selectedBatch.expiresAt);
    setCorrectionLocationId(selectedBatch.locationId);
  }, [selectedBatch]);

  if (batches.isLoading || articles.isLoading || locations.isLoading) {
    return <LoadingPanel label="Lagerbestand wird geladen" />;
  }
  if (batches.isError || articles.isError || locations.isError) {
    return <ErrorPanel error={toError(batches.error ?? articles.error ?? locations.error)} onRetry={() => void Promise.all([batches.refetch(), articles.refetch(), locations.refetch()])} />;
  }
  if (!batches.data || !articles.data || !locations.data) {
    return <LoadingPanel label="Lagerbestand wird geladen" />;
  }

  const expiring = batches.data.filter((batch) => daysUntil(batch.expiresAt) <= 90);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Lager</h1>
          <p>Bestand nach Artikel, Lagerort, Charge und Ablaufdatum.</p>
        </div>
        <div className="topbar-actions">
          <AnchorButton variant="secondary" href={rescueBaseApi.reportUrl("/reports/csv/inventory")}>
            <Download data-icon="inline-start" />
            CSV Bestand
          </AnchorButton>
        </div>
      </header>
      <section className="metric-grid metric-grid-compact" aria-label="Lagerkennzahlen">
        <Metric icon={<Archive />} label="Chargen" value={String(batches.data.length)} tone="info" />
        <Metric icon={<AlertTriangle />} label="Ablaufwarnungen" value={String(expiring.length)} tone="danger" />
      </section>
      <Panel>
        <div className="panel-header">
          <div>
            <h2>Charge erfassen</h2>
            <p>Neue Bestände werden chargengenau mit Ablaufdatum angelegt.</p>
          </div>
          <Archive />
        </div>
        <div className="form-grid form-grid-five">
          <Field label="Artikel">
            <select value={selectedArticleId} onChange={(event) => setArticleId(event.target.value)}>
              {articles.data.map((article) => (
                <option key={article.id} value={article.id}>{article.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Lagerort">
            <select value={selectedLocationId} onChange={(event) => setLocationId(event.target.value)}>
              {locations.data.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Charge">
            <input value={lotNumber} onChange={(event) => setLotNumber(event.target.value)} />
          </Field>
          <Field label="Ablaufdatum">
            <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </Field>
          <Field label="Menge">
            <input
              min="0"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </Field>
        </div>
        {createMutation.error ? <InlineError error={createMutation.error} /> : null}
        <div className="form-actions">
          <Button
            disabled={!canCreate || createMutation.isPending}
            onClick={() => createMutation.mutate({
              articleId: selectedArticleId,
              locationId: selectedLocationId,
              lotNumber,
              expiresAt,
              quantity
            })}
            type="button"
          >
            <Plus data-icon="inline-start" />
            Charge erfassen
          </Button>
        </div>
      </Panel>
      <section className="workbench">
        <Panel>
          <div className="panel-header">
            <div>
              <h2>Bestandschargen</h2>
              <p>Chargen können nur über Korrekturen angepasst werden.</p>
            </div>
            <Badge tone="info">{batches.data.length} erfasst</Badge>
          </div>
          <div className="table">
            {batches.data.map((batch) => (
              <div className="table-row" key={batch.id}>
                <span>
                  <strong>{batch.article.name}</strong>
                  <small>{batch.lotNumber} · {batch.location.name}</small>
                </span>
                <span>{batch.quantity} {batch.article.unit}</span>
                <div className="row-actions">
                  <Badge tone={daysUntil(batch.expiresAt) <= 90 ? "danger" : "neutral"}>{formatDate(batch.expiresAt)}</Badge>
                  <Button
                    onClick={() => setSelectedBatchId(batch.id)}
                    type="button"
                    variant={selectedBatchId === batch.id ? "secondary" : "ghost"}
                  >
                    <History data-icon="inline-start" />
                    Korrigieren
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          {selectedBatch ? (
            <>
              <div className="panel-header">
                <div>
                  <h2>Chargenkorrektur</h2>
                  <p>{selectedBatch.article.name} · {selectedBatch.article.unit}</p>
                </div>
                <Archive />
              </div>
              <div className="form-grid form-grid-two">
                <Field label="Charge">
                  <input value={correctionLotNumber} onChange={(event) => setCorrectionLotNumber(event.target.value)} />
                </Field>
                <Field label="Lagerort">
                  <select value={correctionLocationId} onChange={(event) => setCorrectionLocationId(event.target.value)}>
                    {locations.data.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Ablaufdatum">
                  <input type="date" value={correctionExpiresAt} onChange={(event) => setCorrectionExpiresAt(event.target.value)} />
                </Field>
                <Field label="Menge">
                  <input min="0" type="number" value={correctionQuantity} onChange={(event) => setCorrectionQuantity(Number(event.target.value))} />
                </Field>
              </div>
              <div className="template-form">
                <Field label="Begründung">
                  <textarea rows={3} value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} />
                </Field>
              </div>
              {correctionMutation.error ? <InlineError error={toError(correctionMutation.error)} /> : null}
              <div className="form-actions">
                <Button
                  disabled={!hasCorrectionChanges || !correctionReason.trim() || correctionMutation.isPending}
                  onClick={() => correctionMutation.mutate({
                    id: selectedBatch.id,
                    body: {
                      reason: correctionReason,
                      quantity: correctionQuantity,
                      lotNumber: correctionLotNumber.trim(),
                      expiresAt: correctionExpiresAt,
                      locationId: correctionLocationId
                    }
                  })}
                  type="button"
                >
                  <Save data-icon="inline-start" />
                  Korrektur buchen
                </Button>
              </div>
              <div className="panel-header panel-subheader">
                <div>
                  <h2>Historie</h2>
                  <p>Bewegungen und Korrekturen dieser Charge.</p>
                </div>
              </div>
              {movements.isLoading ? <LoadingPanel label="Historie wird geladen" /> : null}
              {movements.isError ? <InlineError error={toError(movements.error)} /> : null}
              {movements.data ? (
                <div className="compact-list">
                  {movements.data.map((movement: InventoryMovement) => (
                    <div className="compact-list-row compact-list-row-actions" key={movement.id}>
                      <span>
                        <strong>{formatMovementType(movement.type)}</strong>
                        <small>
                          {formatDateTime(movement.createdAt)} · {movement.actorLabel}
                          {movement.reason ? ` · ${movement.reason}` : ""}
                        </small>
                      </span>
                      <Badge tone={movement.quantity < 0 ? "warning" : movement.quantity > 0 ? "ready" : "info"}>
                        {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState title="Keine Charge ausgewählt" text="Wählen Sie links eine Charge aus, um sie nachvollziehbar zu korrigieren." />
          )}
        </Panel>
      </section>
    </>
  );
}

function MasterDataPage({ user }: { user: AuthenticatedUser }) {
  const queryClient = useQueryClient();
  const articles = useQuery({ queryKey: ["articles"], queryFn: rescueBaseApi.articles });
  const locations = useQuery({ queryKey: ["locations"], queryFn: rescueBaseApi.locations });
  const templates = useQuery({ queryKey: ["templates"], queryFn: rescueBaseApi.templates });
  const createArticle = useMutation({
    mutationFn: rescueBaseApi.createArticle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["articles"] });
    }
  });
  const createLocation = useMutation({
    mutationFn: rescueBaseApi.createLocation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
    }
  });
  const updateArticle = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; unit: string; barcode?: string; criticalDefault: boolean } }) =>
      rescueBaseApi.updateArticle(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["articles"] });
    }
  });
  const updateLocation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; kind: string } }) => rescueBaseApi.updateLocation(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
    }
  });
  const createTemplate = useMutation({
    mutationFn: rescueBaseApi.createTemplate,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["templates"] }),
        queryClient.invalidateQueries({ queryKey: ["kits"] })
      ]);
    }
  });
  const reviseTemplate = useMutation({
    mutationFn: ({
      id,
      body
    }: {
      id: string;
      body: { positions: Array<{ articleId: string; moduleName?: string; requiredQuantity: number; critical: boolean }> };
    }) => rescueBaseApi.reviseTemplate(id, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["templates"] }),
        queryClient.invalidateQueries({ queryKey: ["kits"] })
      ]);
    }
  });

  if (user.role !== "ADMIN") {
    return <ErrorPanel error={new Error("Für Stammdaten ist eine Admin-Rolle erforderlich.")} onRetry={() => undefined} />;
  }
  if (articles.isLoading || locations.isLoading || templates.isLoading) {
    return <LoadingPanel label="Stammdaten werden geladen" />;
  }
  if (articles.isError || locations.isError || templates.isError) {
    return <ErrorPanel error={toError(articles.error ?? locations.error ?? templates.error)} onRetry={() => void Promise.all([articles.refetch(), locations.refetch(), templates.refetch()])} />;
  }
  if (!articles.data || !locations.data || !templates.data) {
    return <LoadingPanel label="Stammdaten werden geladen" />;
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Stammdaten</h1>
          <p>Artikel, Lagerorte und versionierte Rucksackvorlagen.</p>
        </div>
      </header>
      <section className="admin-grid">
        <ArticlePanel
          articles={articles.data}
          error={createArticle.error || updateArticle.error ? toError(createArticle.error ?? updateArticle.error) : null}
          isSubmitting={createArticle.isPending || updateArticle.isPending}
          onCreate={(body) => createArticle.mutate(body)}
          onSave={(id, body) => updateArticle.mutate({ id, body })}
        />
        <LocationPanel
          error={createLocation.error || updateLocation.error ? toError(createLocation.error ?? updateLocation.error) : null}
          isSubmitting={createLocation.isPending || updateLocation.isPending}
          locations={locations.data}
          onCreate={(body) => createLocation.mutate(body)}
          onSave={(id, body) => updateLocation.mutate({ id, body })}
        />
      </section>
      <TemplatePanel
        articles={articles.data}
        error={createTemplate.error || reviseTemplate.error ? toError(createTemplate.error ?? reviseTemplate.error) : null}
        isSubmitting={createTemplate.isPending || reviseTemplate.isPending}
        onCreate={(body) => createTemplate.mutate(body)}
        onRevise={(id, body) => reviseTemplate.mutate({ id, body })}
        templates={templates.data}
      />
    </>
  );
}

function ArticlePanel({
  articles,
  error,
  isSubmitting,
  onCreate,
  onSave
}: {
  articles: Article[];
  error: Error | null;
  isSubmitting: boolean;
  onCreate: (body: { name: string; unit: string; barcode?: string; criticalDefault: boolean }) => void;
  onSave: (id: string, body: { name: string; unit: string; barcode?: string; criticalDefault: boolean }) => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("Stück");
  const [barcode, setBarcode] = useState("");
  const [criticalDefault, setCriticalDefault] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const canSubmit = Boolean(name.trim() && unit.trim());

  function resetForm() {
    setEditingId(null);
    setName("");
    setUnit("Stück");
    setBarcode("");
    setCriticalDefault(false);
  }

  return (
    <Panel>
      <div className="panel-header">
        <div>
          <h2>Artikel</h2>
          <p>Materialstamm mit Einheit, optionalem Barcode und Kritikalität.</p>
        </div>
        <FileText />
      </div>
      <div className="form-grid form-grid-two">
        <Field label="Name">
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Einheit">
          <input value={unit} onChange={(event) => setUnit(event.target.value)} />
        </Field>
        <Field label="Barcode/DataMatrix">
          <input value={barcode} onChange={(event) => setBarcode(event.target.value)} />
        </Field>
        <label className="check-field">
          <input checked={criticalDefault} type="checkbox" onChange={(event) => setCriticalDefault(event.target.checked)} />
          <span>Kritisch als Standard</span>
        </label>
      </div>
      {error ? <InlineError error={error} /> : null}
      <div className="form-actions">
        <Button
          disabled={!canSubmit || isSubmitting}
          onClick={() => {
            const body = { name, unit, barcode: barcode.trim() || undefined, criticalDefault };
            if (editingId) {
              onSave(editingId, body);
            } else {
              onCreate(body);
            }
            resetForm();
          }}
          type="button"
        >
          {editingId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
          {editingId ? "Artikel speichern" : "Artikel anlegen"}
        </Button>
        {editingId ? (
          <Button onClick={resetForm} type="button" variant="ghost">
            <X data-icon="inline-start" />
            Abbrechen
          </Button>
        ) : null}
      </div>
      {articles.length === 0 ? <div className="compact-list-empty">Noch keine Artikel angelegt.</div> : null}
      <div className="compact-list">
        {articles.map((article) => (
          <div className="compact-list-row compact-list-row-actions" key={article.id}>
            <span>
              <strong>{article.name}</strong>
              <small>{article.unit}{article.barcode ? ` · ${article.barcode}` : ""}</small>
            </span>
            <div className="row-actions">
              {article.criticalDefault ? <Badge tone="info">kritisch</Badge> : null}
              <Button
                onClick={() => {
                  setEditingId(article.id);
                  setName(article.name);
                  setUnit(article.unit);
                  setBarcode(article.barcode ?? "");
                  setCriticalDefault(article.criticalDefault);
                }}
                type="button"
                variant="ghost"
              >
                <Pencil data-icon="inline-start" />
                Bearbeiten
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function LocationPanel({
  error,
  isSubmitting,
  locations,
  onCreate,
  onSave
}: {
  error: Error | null;
  isSubmitting: boolean;
  locations: Location[];
  onCreate: (body: { name: string; kind: string }) => void;
  onSave: (id: string, body: { name: string; kind: string }) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("STORAGE");
  const [editingId, setEditingId] = useState<string | null>(null);
  const canSubmit = Boolean(name.trim() && kind);

  function resetForm() {
    setEditingId(null);
    setName("");
    setKind("STORAGE");
  }

  return (
    <Panel>
      <div className="panel-header">
        <div>
          <h2>Lagerorte</h2>
          <p>Standorte für Chargen und physische Rucksäcke.</p>
        </div>
        <MapPin />
      </div>
      <div className="form-grid form-grid-two">
        <Field label="Name">
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Typ">
          <select value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="STORAGE">Lager</option>
            <option value="VEHICLE">Fahrzeug</option>
            <option value="ROOM">Raum</option>
          </select>
        </Field>
      </div>
      {error ? <InlineError error={error} /> : null}
      <div className="form-actions">
        <Button
          disabled={!canSubmit || isSubmitting}
          onClick={() => {
            const body = { name, kind };
            if (editingId) {
              onSave(editingId, body);
            } else {
              onCreate(body);
            }
            resetForm();
          }}
          type="button"
        >
          {editingId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
          {editingId ? "Lagerort speichern" : "Lagerort anlegen"}
        </Button>
        {editingId ? (
          <Button onClick={resetForm} type="button" variant="ghost">
            <X data-icon="inline-start" />
            Abbrechen
          </Button>
        ) : null}
      </div>
      {locations.length === 0 ? <div className="compact-list-empty">Noch keine Lagerorte angelegt.</div> : null}
      <div className="compact-list">
        {locations.map((location) => (
          <div className="compact-list-row compact-list-row-actions" key={location.id}>
            <span>
              <strong>{location.name}</strong>
              <small>{locationKindLabel(location.kind)}</small>
            </span>
            <div className="row-actions">
              <Button
                onClick={() => {
                  setEditingId(location.id);
                  setName(location.name);
                  setKind(location.kind);
                }}
                type="button"
                variant="ghost"
              >
                <Pencil data-icon="inline-start" />
                Bearbeiten
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TemplatePanel({
  articles,
  error,
  isSubmitting,
  onCreate,
  onRevise,
  templates
}: {
  articles: Article[];
  error: Error | null;
  isSubmitting: boolean;
  onCreate: (body: {
    name: string;
    positions: Array<{ articleId: string; moduleName?: string; requiredQuantity: number; critical: boolean }>;
  }) => void;
  onRevise: (
    id: string,
    body: { positions: Array<{ articleId: string; moduleName?: string; requiredQuantity: number; critical: boolean }> }
  ) => void;
  templates: KitTemplate[];
}) {
  const [name, setName] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Array<{ articleId: string; moduleName: string; requiredQuantity: number; critical: boolean }>>([
    { articleId: articles[0]?.id ?? "", moduleName: "", requiredQuantity: 1, critical: false }
  ]);
  const normalizedPositions = positions.map((position) => ({
    articleId: position.articleId || articles[0]?.id || "",
    moduleName: position.moduleName.trim() || undefined,
    requiredQuantity: position.requiredQuantity,
    critical: position.critical
  }));
  const canCreate = Boolean(
    name.trim() &&
    articles.length > 0 &&
    normalizedPositions.length > 0 &&
    normalizedPositions.every((position) => position.articleId && position.requiredQuantity > 0)
  );

  useEffect(() => {
    const firstArticleId = articles[0]?.id;
    if (firstArticleId && positions.some((position) => !position.articleId)) {
      setPositions((current) => current.map((position) => ({ ...position, articleId: position.articleId || firstArticleId })));
    }
  }, [articles, positions]);

  function resetForm() {
    setEditingTemplateId(null);
    setName("");
    setPositions([{ articleId: articles[0]?.id ?? "", moduleName: "", requiredQuantity: 1, critical: false }]);
  }

  return (
    <Panel>
      <div className="panel-header">
        <div>
          <h2>Rucksackvorlagen</h2>
          <p>{editingTemplateId ? "Bearbeiten erzeugt immer eine neue Vorlagenversion." : "Neue Speichervorgänge erzeugen eine weitere Vorlagenversion pro Namen."}</p>
        </div>
        <Layers3 />
      </div>
      <div className="template-form">
        <Field label="Vorlagenname">
          <input disabled={Boolean(editingTemplateId)} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <div className="template-position-list">
          {positions.map((position, index) => (
            <div className="template-position-row" key={index}>
              <Field label="Artikel">
                <select
                  disabled={articles.length === 0}
                  value={position.articleId || articles[0]?.id || ""}
                  onChange={(event) => updatePosition(index, { articleId: event.target.value })}
                >
                  {articles.map((article) => (
                    <option key={article.id} value={article.id}>{article.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Modul">
                <input value={position.moduleName} onChange={(event) => updatePosition(index, { moduleName: event.target.value })} />
              </Field>
              <Field label="Sollmenge">
                <input
                  min="1"
                  type="number"
                  value={position.requiredQuantity}
                  onChange={(event) => updatePosition(index, { requiredQuantity: Number(event.target.value) })}
                />
              </Field>
              <label className="check-field template-critical">
                <input
                  checked={position.critical}
                  type="checkbox"
                  onChange={(event) => updatePosition(index, { critical: event.target.checked })}
                />
                <span>Kritisch</span>
              </label>
              <Button
                disabled={positions.length === 1}
                onClick={() => setPositions((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                type="button"
                variant="ghost"
              >
                Entfernen
              </Button>
            </div>
          ))}
        </div>
        <div className="form-actions split-actions">
          <Button
            disabled={articles.length === 0}
            onClick={() => setPositions((current) => [
              ...current,
              { articleId: articles[0]?.id ?? "", moduleName: "", requiredQuantity: 1, critical: false }
            ])}
            type="button"
            variant="secondary"
          >
            <Plus data-icon="inline-start" />
            Position hinzufügen
          </Button>
          <Button
            disabled={!canCreate || isSubmitting}
            onClick={() => {
              if (editingTemplateId) {
                onRevise(editingTemplateId, { positions: normalizedPositions });
              } else {
                onCreate({ name, positions: normalizedPositions });
              }
              resetForm();
            }}
            type="button"
          >
            {editingTemplateId ? "Neue Version speichern" : "Vorlage speichern"}
          </Button>
          {editingTemplateId ? (
            <Button onClick={resetForm} type="button" variant="ghost">
              <X data-icon="inline-start" />
              Abbrechen
            </Button>
          ) : null}
        </div>
        {articles.length === 0 ? <InlineError error={new Error("Legen Sie zuerst mindestens einen Artikel an.")} /> : null}
        {error ? <InlineError error={error} /> : null}
      </div>
      {templates.length === 0 ? <div className="compact-list-empty">Noch keine Vorlagen angelegt.</div> : null}
      <div className="compact-list">
        {templates.map((template) => (
          <div className="compact-list-row compact-list-row-actions" key={template.id}>
            <span>
              <strong>{template.name} v{template.version}</strong>
              <small>{template.positions.length} Positionen</small>
            </span>
            <div className="row-actions">
              {template.positions.some((position) => position.critical) ? <Badge tone="info">enthält kritisch</Badge> : null}
              <Button
                onClick={() => {
                  setEditingTemplateId(template.id);
                  setName(template.name);
                  setPositions(template.positions.map((position) => ({
                    articleId: position.articleId,
                    moduleName: position.moduleName ?? "",
                    requiredQuantity: position.requiredQuantity,
                    critical: position.critical
                  })));
                }}
                type="button"
                variant="ghost"
              >
                <Pencil data-icon="inline-start" />
                Neue Version ableiten
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );

  function updatePosition(index: number, patch: Partial<{ articleId: string; moduleName: string; requiredQuantity: number; critical: boolean }>) {
    setPositions((current) => current.map((position, currentIndex) => currentIndex === index ? { ...position, ...patch } : position));
  }
}

function CompactList({
  emptyText,
  items
}: {
  emptyText: string;
  items: Array<{ id: string; title: string; meta: string; badge?: string }>;
}) {
  if (items.length === 0) {
    return <div className="compact-list-empty">{emptyText}</div>;
  }
  return (
    <div className="compact-list">
      {items.map((item) => (
        <div className="compact-list-row" key={item.id}>
          <span>
            <strong>{item.title}</strong>
            <small>{item.meta}</small>
          </span>
          {item.badge ? <Badge tone="info">{item.badge}</Badge> : null}
        </div>
      ))}
    </div>
  );
}

function UsersPage({ user }: { user: AuthenticatedUser }) {
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
    mutationFn: ({ id, active }: { id: string; active: boolean }) => rescueBaseApi.setUserActive(id, { active }),
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
          <Button
            disabled={!displayName.trim() || !email.trim() || invite.isPending}
            onClick={() => invite.mutate({ displayName, email, role })}
            type="button"
          >
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
                  onClick={() => toggle.mutate({ id: entry.id, active: !entry.active })}
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

function AccountPage({ user }: { user: AuthenticatedUser }) {
  const queryClient = useQueryClient();
  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totpQrUrl, setTotpQrUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [emailChallengeId, setEmailChallengeId] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [debugCode, setDebugCode] = useState("");
  const [copiedValue, setCopiedValue] = useState("");
  const setupTotp = useMutation({
    mutationFn: rescueBaseApi.setupTotp,
    onSuccess: (result) => {
      setTotpSetup(result);
      setTotpQrUrl("");
      setTotpCode("");
    }
  });
  const enableTotp = useMutation({
    mutationFn: rescueBaseApi.enableTotp,
    onSuccess: async () => {
      setTotpSetup(null);
      setTotpQrUrl("");
      setTotpCode("");
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  });
  const startEmail = useMutation({
    mutationFn: rescueBaseApi.startEmailTwoFactor,
    onSuccess: (result) => {
      setEmailChallengeId(result.challengeId);
      setDebugCode(result.debugCode ?? "");
    }
  });
  const enableEmail = useMutation({
    mutationFn: rescueBaseApi.enableEmailTwoFactor,
    onSuccess: async () => {
      setEmailCode("");
      setEmailChallengeId("");
      setDebugCode("");
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  });
  const disable = useMutation({
    mutationFn: rescueBaseApi.disableTwoFactor,
    onSuccess: async () => {
      setTotpSetup(null);
      setTotpQrUrl("");
      setTotpCode("");
      setEmailCode("");
      setEmailChallengeId("");
      setDebugCode("");
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  });

  useEffect(() => {
    if (!totpSetup) {
      setTotpQrUrl("");
      return;
    }
    void QRCode.toDataURL(totpSetup.otpauthUrl, { margin: 1, width: 220 }).then(setTotpQrUrl).catch(() => setTotpQrUrl(""));
  }, [totpSetup]);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Sicherheit</h1>
          <p>Passwortbasierter Login mit TOTP oder E-Mail-Code als zweitem Faktor.</p>
        </div>
      </header>
      <section className="admin-grid">
        <Panel>
          <div className="panel-header">
            <div>
              <h2>Aktiver Schutz</h2>
              <p>Aktueller Status Ihres Zugangs.</p>
            </div>
            <ShieldCheck />
          </div>
          <div className="compact-list">
            <div className="compact-list-row">
              <span>
                <strong>{user.displayName}</strong>
                <small>{user.email}</small>
              </span>
              <Badge tone={user.twoFactorEnabled ? "ready" : "warning"}>
                {user.twoFactorEnabled ? `2FA ${user.twoFactorMethod}` : "Nur Passwort"}
              </Badge>
            </div>
          </div>
          {disable.error ? <InlineError error={disable.error} /> : null}
          <div className="form-actions">
            <Button disabled={!user.twoFactorEnabled || disable.isPending} onClick={() => disable.mutate()} type="button" variant="danger">
              2FA deaktivieren
            </Button>
          </div>
        </Panel>
        <Panel>
          <div className="panel-header">
            <div>
              <h2>TOTP einrichten</h2>
              <p>Authenticator oder Passwortmanager per QR-Code koppeln und mit Prüfcode aktivieren.</p>
            </div>
            <KeyRound />
          </div>
          <div className="auth-form">
            {totpSetup ? (
              <>
                <div className="totp-setup-card">
                  {totpQrUrl ? <img alt="TOTP-QR-Code" className="totp-qr" src={totpQrUrl} /> : <div className="totp-qr-placeholder">QR wird erzeugt</div>}
                  <div className="totp-setup-copy">
                    <div className="copy-row">
                      <span>Geheimnis</span>
                      <strong>{totpSetup.secret}</strong>
                      <Button
                        onClick={() => copyText(totpSetup.secret, "secret", setCopiedValue)}
                        type="button"
                        variant="ghost"
                      >
                        <Copy data-icon="inline-start" />
                        {copiedValue === "secret" ? "Kopiert" : "Kopieren"}
                      </Button>
                    </div>
                    <div className="copy-row">
                      <span>Einrichtungslink</span>
                      <small>{totpSetup.otpauthUrl}</small>
                      <Button
                        onClick={() => copyText(totpSetup.otpauthUrl, "uri", setCopiedValue)}
                        type="button"
                        variant="ghost"
                      >
                        <Copy data-icon="inline-start" />
                        {copiedValue === "uri" ? "Kopiert" : "Kopieren"}
                      </Button>
                    </div>
                  </div>
                </div>
                <Field label="TOTP-Code">
                  <input inputMode="numeric" value={totpCode} onChange={(event) => setTotpCode(event.target.value)} />
                </Field>
                <Button
                  disabled={totpCode.trim().length < 6 || enableTotp.isPending}
                  onClick={() => enableTotp.mutate({ code: totpCode })}
                  type="button"
                >
                  TOTP aktivieren
                </Button>
              </>
            ) : (
              <Button disabled={setupTotp.isPending} onClick={() => setupTotp.mutate()} type="button">
                TOTP vorbereiten
              </Button>
            )}
            {setupTotp.error ? <InlineError error={setupTotp.error} /> : null}
            {enableTotp.error ? <InlineError error={enableTotp.error} /> : null}
          </div>
        </Panel>
      </section>
      <Panel>
        <div className="panel-header">
          <div>
            <h2>E-Mail-Code einrichten</h2>
            <p>Einmalcode an die hinterlegte E-Mail-Adresse senden und verifizieren.</p>
          </div>
          <Mail />
        </div>
        <div className="auth-form">
          {!emailChallengeId ? (
            <Button disabled={startEmail.isPending} onClick={() => startEmail.mutate()} type="button">
              Code senden
            </Button>
          ) : (
            <>
              <Field label="E-Mail-Code">
                <input inputMode="numeric" value={emailCode} onChange={(event) => setEmailCode(event.target.value)} />
              </Field>
              {debugCode ? <p className="debug-hint">Lokaler Testcode: {debugCode}</p> : null}
              <Button
                disabled={emailCode.trim().length < 6 || enableEmail.isPending}
                onClick={() => enableEmail.mutate({ challengeId: emailChallengeId, code: emailCode })}
                type="button"
              >
                E-Mail-2FA aktivieren
              </Button>
            </>
          )}
          {startEmail.error ? <InlineError error={startEmail.error} /> : null}
          {enableEmail.error ? <InlineError error={enableEmail.error} /> : null}
        </div>
      </Panel>
    </>
  );
}

function InvitationAcceptPage({ token }: { token: string }) {
  const navigate = useNavigate();
  const invitation = useQuery({ queryKey: ["invitation", token], queryFn: () => rescueBaseApi.invitation(token) });
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const accept = useMutation({
    mutationFn: rescueBaseApi.acceptInvitation,
    onSuccess: async () => {
      await navigate({ to: "/" });
    }
  });

  useEffect(() => {
    if (invitation.data?.displayName) {
      setDisplayName(invitation.data.displayName);
    }
  }, [invitation.data?.displayName]);

  if (invitation.isLoading) {
    return <LoadingPanel label="Einladung wird geprüft" />;
  }
  if (invitation.isError || !invitation.data) {
    return <ErrorPanel error={toError(invitation.error)} onRetry={() => void invitation.refetch()} />;
  }

  return (
    <Panel className="auth-panel">
      <div className="panel-header">
        <div>
          <h2>Einladung annehmen</h2>
          <p>{invitation.data.email} · {invitation.data.role === "ADMIN" ? "Admin" : "Lagerwart"}</p>
        </div>
        <Users />
      </div>
      <div className="auth-form">
        <Field label="Name">
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </Field>
        <Field label="Passwort">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <Field label="Passwort wiederholen">
          <input type="password" value={passwordRepeat} onChange={(event) => setPasswordRepeat(event.target.value)} />
        </Field>
        <p className="form-hint">Mindestens 12 Zeichen.</p>
        {accept.error ? <InlineError error={accept.error} /> : null}
        <Button
          disabled={!displayName.trim() || password.length < 12 || password !== passwordRepeat || accept.isPending}
          onClick={() => accept.mutate({ token, password, displayName })}
          type="button"
        >
          Konto aktivieren
        </Button>
      </div>
    </Panel>
  );
}

function PasswordResetRequestPage() {
  const [email, setEmail] = useState("");
  const mutation = useMutation({ mutationFn: rescueBaseApi.requestPasswordReset });

  return (
    <Panel className="auth-panel">
      <div className="panel-header">
        <div>
          <h2>Passwort zurücksetzen</h2>
          <p>Ein Link wird an die hinterlegte E-Mail-Adresse versendet.</p>
        </div>
        <KeyRound />
      </div>
      <div className="auth-form">
        <Field label="E-Mail">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        {mutation.data?.debugUrl ? <p className="debug-hint">Lokaler Reset-Link: {mutation.data.debugUrl}</p> : null}
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button
          disabled={!email.trim() || mutation.isPending}
          onClick={() => mutation.mutate({ email })}
          type="button"
        >
          Reset-Link senden
        </Button>
        <Link className="text-link" to="/">Zur Anmeldung</Link>
      </div>
    </Panel>
  );
}

function PasswordResetConfirmPage({ token }: { token: string }) {
  const navigate = useNavigate();
  const preview = useQuery({ queryKey: ["password-reset-preview", token], queryFn: () => rescueBaseApi.passwordResetPreview(token) });
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const mutation = useMutation({
    mutationFn: rescueBaseApi.confirmPasswordReset,
    onSuccess: async () => {
      await navigate({ to: "/" });
    }
  });

  if (preview.isLoading) {
    return <LoadingPanel label="Reset-Link wird geprüft" />;
  }
  if (preview.isError || !preview.data) {
    return <ErrorPanel error={toError(preview.error)} onRetry={() => void preview.refetch()} />;
  }

  return (
    <Panel className="auth-panel">
      <div className="panel-header">
        <div>
          <h2>Neues Passwort setzen</h2>
          <p>{preview.data.email}</p>
        </div>
        <KeyRound />
      </div>
      <div className="auth-form">
        <Field label="Passwort">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <Field label="Passwort wiederholen">
          <input type="password" value={passwordRepeat} onChange={(event) => setPasswordRepeat(event.target.value)} />
        </Field>
        <p className="form-hint">Mindestens 12 Zeichen.</p>
        {mutation.error ? <InlineError error={mutation.error} /> : null}
        <Button
          disabled={password.length < 12 || password !== passwordRepeat || mutation.isPending}
          onClick={() => mutation.mutate({ token, password })}
          type="button"
        >
          Passwort speichern
        </Button>
      </div>
    </Panel>
  );
}

function PublicCheck({ token }: { token: string }) {
  const query = useQuery({ queryKey: ["public-kit", token], queryFn: () => rescueBaseApi.publicKit(token) });
  const mutation = useMutation({ mutationFn: (body: Parameters<typeof rescueBaseApi.completeCheck>[1]) => rescueBaseApi.completeCheck(token, body) });

  if (query.isLoading) {
    return <div className="mobile-check loading">Rucksack wird geladen...</div>;
  }
  if (query.isError) {
    return (
      <main className="mobile-check">
        <ErrorPanel error={toError(query.error)} onRetry={() => void query.refetch()} />
      </main>
    );
  }
  if (!query.data) {
    return <div className="mobile-check loading">Rucksack wird geladen...</div>;
  }

  return <PublicCheckForm publicKit={query.data} submitError={mutation.error} submitResult={mutation.data} onSubmit={mutation.mutate} />;
}

function PublicCheckForm({
  publicKit,
  submitError,
  submitResult,
  onSubmit
}: {
  publicKit: PublicKitResponse;
  submitError: Error | null;
  submitResult?: { check: { id: string }; replenishmentOrder?: ReplenishmentOrder };
  onSubmit: (body: Parameters<typeof rescueBaseApi.completeCheck>[1]) => void;
}) {
  const [checkerName, setCheckerName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<KitOperationalStatus>("READY");
  const [statusReason, setStatusReason] = useState("");
  const [lines, setLines] = useState<CheckLineState[]>(() => initialCheckLines(publicKit.template.positions));
  const [signatureHasInk, setSignatureHasInk] = useState(false);
  const [signatureError, setSignatureError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSignatureRef = useRef(false);
  const groupedPositions = useMemo(() => groupTemplatePositions(publicKit.template.positions), [publicKit.template.positions]);
  const linesById = useMemo(() => new Map(lines.map((line) => [line.templatePositionId, line])), [lines]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.strokeStyle = "#111827";
  }, []);

  const summary = useMemo(
    () => summarizeCheck(publicKit.template.positions, lines, selectedStatus),
    [lines, publicKit.template.positions, selectedStatus]
  );
  const canSubmit = checkerName.trim().length > 0 && (!summary.requiresReason || statusReason.trim().length > 0);

  if (submitResult) {
    return (
      <main className="mobile-check">
        <Panel className="success-panel">
          <CheckCircle2 />
          <h1>Check abgeschlossen</h1>
          <p>Protokoll {submitResult.check.id} wurde gespeichert.</p>
          {submitResult.replenishmentOrder ? (
            <p>Nachfüllauftrag {submitResult.replenishmentOrder.id} wurde erzeugt.</p>
          ) : (
            <p>Es wurde kein Nachfüllauftrag benötigt.</p>
          )}
        </Panel>
      </main>
    );
  }

  return (
    <main className="mobile-check">
      <header className="check-header">
        <div>
          <span>{publicKit.kit.code}</span>
          <h1>{publicKit.kit.name}</h1>
          <p>{publicKit.template.name} · Version {publicKit.template.version}</p>
        </div>
        <Badge tone={selectedStatus === "READY" ? "ready" : selectedStatus === "CONDITIONAL" ? "warning" : "danger"}>
          {statusLabels[selectedStatus]}
        </Badge>
      </header>

      <Panel className="checker-panel">
        <Field label="Prüfername">
          <input value={checkerName} onChange={(event) => setCheckerName(event.target.value)} />
        </Field>
        <div className="status-toggle" role="radiogroup" aria-label="Einsatzbereitschaft">
          {(["READY", "CONDITIONAL", "NOT_READY"] as KitOperationalStatus[]).map((status) => (
            <button
              key={status}
              className={selectedStatus === status ? "selected" : ""}
              onClick={() => setSelectedStatus(status)}
              type="button"
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>
      </Panel>

      <section className="check-list">
        {groupedPositions.map((group) => (
          <section className="check-group" key={group.key} aria-label={`Modul ${group.title}`}>
            <div className="check-group-header">
              <h2>{group.title}</h2>
              <span>{group.positions.length} Positionen</span>
            </div>
            {group.positions.map((position) => {
              const line = linesById.get(position.id);
              const counted = line?.countedQuantity ?? 0;
              const discarded = line?.discardedExpiredQuantity ?? 0;
              return (
                <Panel className="check-item" key={position.id}>
                  <div>
                    <span>{position.critical ? "Kritische Position" : "Materialposition"}</span>
                    <h3>{position.articleName}</h3>
                    <p>Soll: {position.requiredQuantity} {position.unit}</p>
                  </div>
                  <Stepper label="Ist" value={counted} onChange={(value) => updateLine(position.id, { countedQuantity: value })} />
                  <Stepper label="Verworfen" value={discarded} onChange={(value) => updateLine(position.id, { discardedExpiredQuantity: value })} />
                </Panel>
              );
            })}
          </section>
        ))}
      </section>

      {summary.warnings.length > 0 ? (
        <Panel className="warning-panel">
          <AlertTriangle />
          <div>
            <strong>Bitte prüfen</strong>
            {summary.warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        </Panel>
      ) : null}

      {summary.requiresReason ? (
        <Field label="Begründung">
          <textarea value={statusReason} onChange={(event) => setStatusReason(event.target.value)} rows={3} />
        </Field>
      ) : null}

      <Panel className="signature-panel">
        <div className="panel-header">
          <div>
            <h2>Unterschrift</h2>
            <p>Name, Zeitstempel und Signatur werden 3 Jahre gespeichert.</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              clearSignatureCanvas();
              setSignatureError("");
            }}
            type="button"
          >
            Löschen
          </Button>
        </div>
        <canvas
          ref={canvasRef}
          width="640"
          height="220"
          aria-label="Unterschriftenfeld"
          onPointerDown={startSignatureStroke}
          onPointerMove={drawSignatureStroke}
          onPointerUp={endSignatureStroke}
          onPointerCancel={endSignatureStroke}
        />
      </Panel>

      {signatureError ? <InlineError error={new Error(signatureError)} /> : null}
      {submitError ? <InlineError error={submitError} /> : null}

      <footer className="check-footer">
        <div>
          <strong>{summary.missingCount + summary.discardedCount}</strong>
          <span>Nachfüllbedarf</span>
        </div>
        <Button disabled={!canSubmit} onClick={submitCheck} type="button">Check abschließen</Button>
      </footer>
    </main>
  );

  function submitCheck() {
    if (!signatureHasInk) {
      setSignatureError("Bitte unterschreiben Sie den Check.");
      return;
    }
    const signature = canvasRef.current?.toDataURL("image/png");
    if (!signature) {
      return;
    }
    onSubmit({
      checkerName,
      selectedStatus,
      statusReason,
      signaturePngDataUrl: signature,
      positions: lines
    });
  }

  function startSignatureStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) {
      return;
    }
    const point = canvasPoint(event);
    isDrawingSignatureRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setSignatureHasInk(true);
    setSignatureError("");
  }

  function drawSignatureStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingSignatureRef.current) {
      return;
    }
    const context = event.currentTarget.getContext("2d");
    if (!context) {
      return;
    }
    const point = canvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function endSignatureStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingSignatureRef.current) {
      return;
    }
    isDrawingSignatureRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function clearSignatureCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureHasInk(false);
  }

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (event.currentTarget.width / rect.width),
      y: (event.clientY - rect.top) * (event.currentTarget.height / rect.height)
    };
  }

  function updateLine(positionId: string, patch: Partial<CheckLineState>) {
    setLines((current) =>
      current.map((line) =>
        line.templatePositionId === positionId
          ? { ...line, ...patch }
          : line
      )
    );
  }
}

function OrderDetail({
  batches,
  error,
  isSubmitting,
  order,
  onFulfill
}: {
  batches: Batch[];
  error: Error | null;
  isSubmitting: boolean;
  order: ReplenishmentOrder;
  onFulfill: (items: Array<{ itemId: string; batchId: string; quantity: number }>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, { batchId: string; quantity: number }>>({});
  const remaining = order.items.reduce((sum, item) => sum + item.requestedQuantity - item.fulfilledQuantity, 0);
  const fulfillmentItems = Object.entries(draft)
    .filter(([, entry]) => entry.quantity > 0 && entry.batchId)
    .map(([itemId, entry]) => ({ itemId, batchId: entry.batchId, quantity: entry.quantity }));

  useEffect(() => setDraft({}), [order.id]);

  return (
    <div className="order-detail">
      <div className="panel-header">
        <div>
          <h2>{order.kit?.name ?? order.kitId}</h2>
          <p>{order.id} · Restmenge {remaining}</p>
        </div>
        <Badge tone={order.status === "OPEN" ? "warning" : order.status === "DONE" ? "ready" : "info"}>{formatStatus(order.status)}</Badge>
      </div>
      <div className="fulfillment-list">
        {order.items.map((item) => {
          const openQuantity = item.requestedQuantity - item.fulfilledQuantity;
          const availableBatches = batches
            .filter((batch) => batch.articleId === item.articleId && batch.quantity > 0)
            .sort((left, right) => left.expiresAt.localeCompare(right.expiresAt));
          const draftEntry = draft[item.templatePositionId] ?? { batchId: availableBatches[0]?.id ?? "", quantity: 0 };
          return (
            <div className="fulfillment-row" key={item.templatePositionId}>
              <div>
                <strong>{item.articleName}</strong>
                <small>{item.fulfilledQuantity}/{item.requestedQuantity} {item.unit} · {formatReason(item.reason)}</small>
              </div>
              <select
                aria-label={`Charge für ${item.articleName}`}
                disabled={openQuantity === 0 || availableBatches.length === 0}
                value={draftEntry.batchId}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  [item.templatePositionId]: { ...draftEntry, batchId: event.target.value }
                }))}
              >
                {availableBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.lotNumber} · {batch.quantity} verfügbar
                  </option>
                ))}
              </select>
              <Stepper
                label="Auffüllen"
                value={draftEntry.quantity}
                max={Math.min(openQuantity, selectedBatchQuantity(availableBatches, draftEntry.batchId))}
                onChange={(value) => setDraft((current) => ({
                  ...current,
                  [item.templatePositionId]: { batchId: draftEntry.batchId, quantity: value }
                }))}
              />
            </div>
          );
        })}
      </div>
      {error ? <InlineError error={error} /> : null}
      <div className="detail-actions">
        <AnchorButton variant="secondary" href={rescueBaseApi.reportUrl(`/reports/replenishment/${order.id}.pdf`)}>
          <Truck data-icon="inline-start" />
          PDF Auftrag
        </AnchorButton>
        <Button
          disabled={fulfillmentItems.length === 0 || isSubmitting || order.status === "DONE" || order.status === "CANCELLED"}
          onClick={() => onFulfill(fulfillmentItems)}
          type="button"
        >
          Teilfüllung buchen
        </Button>
      </div>
    </div>
  );
}

function Stepper({ label, value, max, onChange }: { label: string; value: number; max?: number; onChange: (value: number) => void }) {
  const upperLimit = max ?? 999;
  return (
    <div className="stepper" aria-label={label}>
      <span>{label}</span>
      <div>
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`${label} verringern`}><Minus /></button>
        <strong>{value}</strong>
        <button type="button" onClick={() => onChange(Math.min(upperLimit, value + 1))} aria-label={`${label} erhöhen`}><Plus /></button>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "ready" | "warning" | "danger" | "info" }) {
  return (
    <Panel className="metric">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </Panel>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <Panel className="state-panel">
      <h1>{label}</h1>
    </Panel>
  );
}

function ErrorPanel({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Panel className="state-panel error-state">
      <AlertTriangle />
      <h1>API nicht verfügbar</h1>
      <p>{error.message}</p>
      <Button onClick={onRetry} type="button">Erneut versuchen</Button>
    </Panel>
  );
}

function InlineError({ error }: { error: Error }) {
  return (
    <div className="inline-error" role="alert">
      <AlertTriangle />
      <span>{error.message}</span>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <ClipboardList />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function useDashboardData() {
  const kits = useQuery({ queryKey: ["kits"], queryFn: rescueBaseApi.kits });
  const batches = useQuery({ queryKey: ["batches"], queryFn: rescueBaseApi.batches });
  const orders = useQuery({ queryKey: ["orders"], queryFn: rescueBaseApi.orders });

  return {
    data: kits.data && batches.data && orders.data ? { kits: kits.data, batches: batches.data, orders: orders.data } : undefined,
    error: kits.error ?? batches.error ?? orders.error,
    isError: kits.isError || batches.isError || orders.isError,
    isLoading: kits.isLoading || batches.isLoading || orders.isLoading,
    refetch: async () => {
      await Promise.all([kits.refetch(), batches.refetch(), orders.refetch()]);
    }
  };
}

function selectedBatchQuantity(batches: Batch[], batchId: string): number {
  return batches.find((batch) => batch.id === batchId)?.quantity ?? 0;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Unbekannter Fehler.");
}

function formatStatus(status: string): string {
  return {
    OPEN: "Offen",
    IN_PROGRESS: "In Arbeit",
    DONE: "Erledigt",
    CANCELLED: "Storniert"
  }[status] ?? status;
}

function formatReason(reason: string): string {
  return {
    SHORTAGE: "Fehlmenge",
    DISCARDED_EXPIRED: "Abgelaufen verworfen",
    SHORTAGE_AND_DISCARDED_EXPIRED: "Fehlmenge und Verwurf"
  }[reason] ?? reason;
}

function formatMovementType(type: string): string {
  return {
    BATCH_CREATED: "Ersterfassung",
    BATCH_CORRECTION: "Korrektur",
    REPLENISHMENT_FULFILLMENT: "Nachfüllung"
  }[type] ?? type;
}

function locationKindLabel(kind: string): string {
  return {
    STORAGE: "Lager",
    VEHICLE: "Fahrzeug",
    ROOM: "Raum"
  }[kind] ?? kind;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin"
  }).format(new Date(value));
}

function daysUntil(value: string): number {
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

async function copyText(value: string, key: string, setCopiedValue: (value: string) => void) {
  try {
    await navigator.clipboard.writeText(value);
    setCopiedValue(key);
    window.setTimeout(() => setCopiedValue(""), 1500);
  } catch {
    setCopiedValue("");
  }
}
