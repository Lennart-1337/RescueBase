import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App, { createAppMemoryRouter } from "./App";

const kit = {
  id: "kit-rucksack-1",
  name: "Rucksack Fahrzeug 1",
  code: "SAN-RS-001",
  status: "READY",
  publicToken: "SAN-RS-001-ZUGANG-2026",
  location: { id: "loc-rtw-1", name: "Fahrzeug 1" },
  template: {
    id: "template-san-a-v1",
    name: "Sanitätsrucksack A",
    version: 1,
    positions: []
  }
};

const batch = {
  id: "batch-bandage-1",
  articleId: "article-bandage",
  lotNumber: "VB-2026-04",
  expiresAt: "2027-04-30",
  quantity: 120,
  article: { id: "article-bandage", name: "Verbandpäckchen mittel", unit: "Stück" },
  location: { id: "loc-main", name: "Hauptlager" }
};

const article = { id: "article-bandage", name: "Verbandpäckchen mittel", unit: "Stück", criticalDefault: false };
const location = { id: "loc-main", name: "Hauptlager", kind: "STORAGE" };

const order = {
  id: "order-1001",
  kitId: "kit-rucksack-1",
  status: "OPEN",
  createdAt: "2026-06-11T09:15:00.000Z",
  updatedAt: "2026-06-11T09:15:00.000Z",
  kit,
  items: [
    {
      articleId: "article-bandage",
      articleName: "Verbandpäckchen mittel",
      templatePositionId: "pos-bandage",
      requestedQuantity: 3,
      fulfilledQuantity: 0,
      unit: "Stück",
      reason: "SHORTAGE",
      critical: false
    }
  ]
};

let activeRouter: ReturnType<typeof createAppMemoryRouter> | undefined;

describe("RescueBase web app", () => {
  afterEach(() => {
    activeRouter = undefined;
    vi.restoreAllMocks();
    history.pushState({}, "", "/");
  });

  it("renders the TanStack-routed admin dashboard from API data", async () => {
    history.pushState({}, "", "/");
    stubFetch({
      "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false
        }
      },
      "/api/catalog/kits": [kit],
      "/api/inventory/batches": [batch],
      "/api/replenishment-orders": [order]
    });

    await renderApp();

    expect(await screen.findByRole("heading", { name: "Nachfüllzentrale" })).toBeInTheDocument();
    expect(await screen.findByText("order-1001 · Restmenge 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CSV Aufträge/ })).toHaveAttribute("href", "/api/reports/csv/replenishment");
  });

  it("renders the public check route from the token path", async () => {
    history.pushState({}, "", "/check/SAN-RS-001-ZUGANG-2026");
    stubFetch({
      "/api/public/kits/SAN-RS-001-ZUGANG-2026": {
        kit,
        template: {
          ...kit.template,
          positions: [
            {
              id: "pos-bandage",
              articleId: "article-bandage",
              articleName: "Verbandpäckchen mittel",
              moduleName: "Verband",
              requiredQuantity: 6,
              unit: "Stück",
              critical: false
            },
            {
              id: "pos-tourniquet",
              articleId: "article-tourniquet",
              articleName: "Tourniquet",
              moduleName: "Blutung",
              requiredQuantity: 1,
              unit: "Stück",
              critical: true
            },
            {
              id: "pos-dreiecktuch",
              articleId: "article-dreiecktuch",
              articleName: "Dreiecktuch",
              moduleName: "Verband",
              requiredQuantity: 2,
              unit: "Stück",
              critical: false
            }
          ]
        }
      }
    });

    await renderApp();

    expect(await screen.findByRole("heading", { name: "Rucksack Fahrzeug 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Verband" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Blutung" })).toBeInTheDocument();
    expect(screen.getByText("Verbandpäckchen mittel")).toBeInTheDocument();
    expect(screen.getByText("Dreiecktuch")).toBeInTheDocument();
  });

  it("does not render seeded fallback data when the API is unavailable", async () => {
    history.pushState({}, "", "/");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await renderApp();

    expect(await screen.findByRole("heading", { name: "API nicht verfügbar" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Rucksack Fahrzeug 1")).not.toBeInTheDocument());
  });

  it("submits new articles from the admin master data screen", async () => {
    history.pushState({}, "", "/admin/stammdaten");
    stubFetch({
      "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false
        }
      },
      "/api/catalog/articles": [article],
      "/api/catalog/locations": [location],
      "/api/catalog/templates": [kit.template]
    });

    await renderApp();

    const articlePanel = (await screen.findByRole("heading", { name: "Artikel" })).closest("section");
    expect(articlePanel).not.toBeNull();
    await changeValue(within(articlePanel as HTMLElement).getByLabelText("Name"), "Rettungsdecke");
    await changeValue(within(articlePanel as HTMLElement).getByLabelText("Einheit"), "Stück");
    await changeValue(within(articlePanel as HTMLElement).getByLabelText("Barcode/DataMatrix"), "040000000099");
    await clickElement(within(articlePanel as HTMLElement).getByRole("button", { name: /Artikel anlegen/ }));

    await waitFor(() => expect(postedBody("/api/catalog/articles")).toEqual({
      name: "Rettungsdecke",
      unit: "Stück",
      barcode: "040000000099",
      criticalDefault: false
    }));
  });

  it("edits existing articles from the admin master data screen", async () => {
    history.pushState({}, "", "/admin/stammdaten");
    stubFetch({
      "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false
        }
      },
      "/api/catalog/articles": [article],
      "/api/catalog/locations": [location],
      "/api/catalog/templates": [kit.template],
      "/api/catalog/articles/article-bandage": {
        ...article,
        name: "Verbandpäckchen groß",
        barcode: "040000000099"
      }
    });

    await renderApp();

    const articlePanel = (await screen.findByRole("heading", { name: "Artikel" })).closest("section");
    expect(articlePanel).not.toBeNull();
    await clickElement(within(articlePanel as HTMLElement).getByRole("button", { name: /Bearbeiten/ }));
    await changeValue(within(articlePanel as HTMLElement).getByLabelText("Name"), "Verbandpäckchen groß");
    await changeValue(within(articlePanel as HTMLElement).getByLabelText("Barcode/DataMatrix"), "040000000099");
    await clickElement(within(articlePanel as HTMLElement).getByRole("button", { name: /Artikel speichern/ }));

    await waitFor(() => expect(requestBody("/api/catalog/articles/article-bandage", "PATCH")).toEqual({
      name: "Verbandpäckchen groß",
      unit: "Stück",
      barcode: "040000000099",
      criticalDefault: false
    }));
  });

  it("submits new inventory batches with article, location, lot and expiry data", async () => {
    history.pushState({}, "", "/admin/lager");
    stubFetch({
      "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false
        }
      },
      "/api/inventory/batches": [batch],
      "/api/catalog/articles": [article],
      "/api/catalog/locations": [location]
    });

    await renderApp();

    expect(await screen.findByRole("heading", { name: "Lager" })).toBeInTheDocument();
    await changeValue(screen.getByLabelText("Charge"), "RD-2028-02");
    await changeValue(screen.getByLabelText("Ablaufdatum"), "2028-02-29");
    await changeValue(screen.getByLabelText("Menge"), "25");
    await clickElement(screen.getByRole("button", { name: /Charge erfassen/ }));

    await waitFor(() => expect(postedBody("/api/inventory/batches")).toEqual({
      articleId: "article-bandage",
      locationId: "loc-main",
      lotNumber: "RD-2028-02",
      expiresAt: "2028-02-29",
      quantity: 25
    }));
  });

  it("submits batch corrections with reason and tracks history loading", async () => {
    history.pushState({}, "", "/admin/lager");
    stubFetch({
      "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false
        }
      },
      "/api/inventory/batches": [batch],
      "/api/catalog/articles": [article],
      "/api/catalog/locations": [location],
      "/api/inventory/batches/batch-bandage-1/movements": []
    });

    await renderApp();

    await clickElement(await screen.findByRole("button", { name: /Korrigieren/ }));
    const correctionPanel = (await screen.findByRole("heading", { name: "Chargenkorrektur" })).closest("section");
    expect(correctionPanel).not.toBeNull();
    await changeValue(within(correctionPanel as HTMLElement).getByLabelText("Charge"), "VB-2026-04A");
    await changeValue(within(correctionPanel as HTMLElement).getByLabelText("Begründung"), "Inventur");
    await clickElement(within(correctionPanel as HTMLElement).getByRole("button", { name: /Korrektur buchen/ }));

    await waitFor(() => expect(postedBody("/api/inventory/batches/batch-bandage-1/corrections")).toEqual({
      reason: "Inventur",
      quantity: 120,
      lotNumber: "VB-2026-04A",
      expiresAt: "2027-04-30"
    }));
  });

  it("renders a TOTP QR code after preparing 2FA", async () => {
    history.pushState({}, "", "/admin/konto");
    stubFetch({
      "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false
        }
      },
      "/api/auth/2fa/totp/setup": {
        secret: "ABCDEF123456",
        otpauthUrl: "otpauth://totp/RescueBase:admin@rescuebase.local?secret=ABCDEF123456&issuer=RescueBase"
      }
    });

    await renderApp();

    await clickElement(await screen.findByRole("button", { name: /TOTP vorbereiten/ }));

    expect(await screen.findByAltText("TOTP-QR-Code")).toBeInTheDocument();
    expect(screen.getByText("ABCDEF123456")).toBeInTheDocument();
  });

  it("submits invitation acceptance from the public invitation route", async () => {
    history.pushState({}, "", "/einladung/token-123");
    stubFetch({
      "/api/auth/invitations/token-123": {
        email: "lager-neu@rescuebase.local",
        displayName: "Neues Lagerteam",
        role: "WAREHOUSE"
      },
      "/api/auth/invitations/accept": {
        ok: true,
        user: {
          id: "user-neu",
          email: "lager-neu@rescuebase.local",
          displayName: "Lager Nord",
          role: "WAREHOUSE",
          twoFactorEnabled: false
        }
      }
    });

    await renderApp();

    expect(await screen.findByRole("heading", { name: "Einladung annehmen" })).toBeInTheDocument();
    await changeValue(screen.getByLabelText("Name"), "Lager Nord");
    await changeValue(screen.getByLabelText("Passwort"), "rescuebase-neu");
    await changeValue(screen.getByLabelText("Passwort wiederholen"), "rescuebase-neu");
    await clickElement(screen.getByRole("button", { name: /Konto aktivieren/ }));

    await waitFor(() => expect(postedBody("/api/auth/invitations/accept")).toEqual({
      token: "token-123",
      password: "rescuebase-neu",
      displayName: "Lager Nord"
    }));
  });

  it("submits password reset requests from the public reset screen", async () => {
    history.pushState({}, "", "/passwort-vergessen");
    stubFetch({
      "/api/auth/password-reset/request": {
        ok: true,
        debugUrl: "http://localhost:5173/passwort-zuruecksetzen/reset-123"
      }
    });

    await renderApp();

    expect(await screen.findByRole("heading", { name: "Passwort zurücksetzen" })).toBeInTheDocument();
    await changeValue(screen.getByLabelText("E-Mail"), "lager-neu@rescuebase.local");
    await clickElement(screen.getByRole("button", { name: /Reset-Link senden/ }));

    await waitFor(() => expect(postedBody("/api/auth/password-reset/request")).toEqual({
      email: "lager-neu@rescuebase.local"
    }));
    expect(screen.getByText(/Lokaler Reset-Link/)).toBeInTheDocument();
  });
});

function stubFetch(routes: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      const pathname = url.startsWith("http") ? new URL(url).pathname : url;
      const body = routes[pathname];
      if (!body) {
        return new Response(JSON.stringify({ message: `No test route for ${pathname}` }), {
          status: 404,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    })
  );
}

function postedBody(pathname: string): unknown {
  return requestBody(pathname, "POST");
}

function requestBody(pathname: string, method: string): unknown {
  const calls = (fetch as unknown as { mock: { calls: Array<[RequestInfo | URL, RequestInit | undefined]> } }).mock.calls;
  const call = calls.find(([input, init]) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    return path === pathname && (init?.method ?? "GET") === method;
  });
  return call?.[1]?.body ? JSON.parse(String(call[1].body)) : undefined;
}

async function renderApp() {
  activeRouter = createAppMemoryRouter(window.location.pathname);
  await act(async () => {
    await activeRouter?.load();
    render(<App router={activeRouter} />);
    await flushUi();
  });
}

async function clickElement(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
    await flushUi();
  });
}

async function changeValue(element: HTMLElement, value: string) {
  await act(async () => {
    fireEvent.change(element, { target: { value } });
    await flushUi();
  });
}

async function flushUi() {
  await Promise.resolve();
}
