import { screen, waitFor } from "@testing-library/react";
import { changeValue, clickElement, renderAppAt, resetTestBrowser } from "../test-support/app-test-helpers";

describe("auth boundary", () => {
  afterEach(resetTestBrowser);

  it("clears cached account data before another user signs in", async () => {
    const admin = { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } as const;
    const warehouse = { id: "user-warehouse", email: "lager@rescuebase.local", displayName: "Lager", role: "WAREHOUSE", twoFactorEnabled: false } as const;
    let sessionUser: typeof admin | typeof warehouse | null = admin;
    let kits = [{ id: "kit-admin", name: "Admin Rucksack", code: "SAN-1", status: "READY", locationId: "loc-1", templateId: "tpl-1", publicToken: "KIT-1" }];

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      const pathname = url.startsWith("http") ? new URL(url).pathname : url;
      const method = init?.method ?? "GET";

      if (pathname === "/api/auth/setup/status") return json({ initialized: true });
      if (pathname === "/api/auth/session") return json(sessionUser ? { user: sessionUser } : {});
      if (pathname === "/api/auth/logout" && method === "POST") {
        sessionUser = null;
        return json({});
      }
      if (pathname === "/api/auth/login" && method === "POST") {
        sessionUser = warehouse;
        kits = [{ id: "kit-warehouse", name: "Lager Rucksack", code: "SAN-2", status: "READY", locationId: "loc-1", templateId: "tpl-1", publicToken: "KIT-2" }];
        return json({});
      }
      if (pathname === "/api/catalog/kits") return json(kits);
      if (pathname === "/api/catalog/locations") return json([{ id: "loc-1", name: "Hauptlager", kind: "STORAGE" }]);
      if (pathname === "/api/catalog/templates") return json([{ id: "tpl-1", name: "Standard", version: 1, itemCount: 0 }]);

      return new Response(JSON.stringify({ message: `No test route for ${pathname}` }), { status: 404, headers: { "content-type": "application/json" } });
    }));

    await renderAppAt("/admin/kits");
    expect(await screen.findByText("Admin Rucksack")).toBeInTheDocument();

    await clickElement(screen.getByRole("button", { name: "Abmelden" }));
    await screen.findByRole("heading", { name: "Anmelden" });

    await changeValue(screen.getByLabelText("E-Mail"), "lager@rescuebase.local");
    await changeValue(screen.getByLabelText("Passwort"), "secret123");
    await clickElement(screen.getByRole("button", { name: "Anmelden" }));

    expect(await screen.findByText("Lager Rucksack")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Admin Rucksack")).toBeNull());
  });
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}
