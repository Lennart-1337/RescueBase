import { screen, waitFor, within } from "@testing-library/react";
import { kit } from "../test-support/fixtures";
import { changeValue, clickElement, getActiveRouter, renderAppAt, resetTestBrowser, wasRequested } from "../test-support/app-test-helpers";

describe("KitsPage", () => {
  afterEach(resetTestBrowser);

  it("updates the check and QR links immediately after rotating the public token", async () => {
    let currentKit = { ...kit };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      const pathname = url.startsWith("http") ? new URL(url).pathname : url;
      const method = init?.method ?? "GET";

      if (pathname === "/api/auth/setup/status") {
        return jsonResponse({ initialized: true, firstAdminEmail: "admin@rescuebase.local" });
      }
      if (pathname === "/api/auth/session") {
        return jsonResponse({
          user: {
            id: "user-admin",
            email: "admin@rescuebase.local",
            displayName: "Admin",
            role: "ADMIN",
            twoFactorEnabled: false
          }
        });
      }
      if (pathname === "/api/catalog/kits" && method === "GET") {
        return jsonResponse([currentKit]);
      }
      if (pathname === "/api/catalog/locations") {
        return jsonResponse([kit.location]);
      }
      if (pathname === "/api/catalog/templates") {
        return jsonResponse([kit.template]);
      }
      if (pathname === "/api/catalog/kits/kit-rucksack-1/rotate-token" && method === "POST") {
        currentKit = {
          ...currentKit,
          publicToken: "SAN-RS-001-ROTATED-2026",
          tokenRotatedAt: "2026-06-15T20:00:00.000Z"
        };
        return jsonResponse(currentKit);
      }

      return new Response(JSON.stringify({ message: `No test route for ${pathname}` }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    }));

    await renderAppAt("/admin/kits");
    await screen.findByRole("heading", { level: 1, name: "Rucksäcke" });

    const row = screen.getByText("Rucksack Fahrzeug 1").closest(".table-row") as HTMLElement;
    await clickElement(within(row).getByRole("button", { name: /Rotieren/ }));

    await waitFor(() =>
      expect(within(row).getByRole("link", { name: /Check öffnen/ })).toHaveAttribute(
        "href",
        "/check/SAN-RS-001-ROTATED-2026"
      )
    );
    await waitFor(() =>
      expect(within(row).getByRole("link", { name: /A4-PDF/ })).toHaveAttribute(
        "href",
        "/api/reports/qr-label/kit-rucksack-1.pdf?format=a4&rev=2026-06-15T20%3A00%3A00.000Z"
      )
    );
  });

  it("opens an edit dialog with the current kit values", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      const pathname = url.startsWith("http") ? new URL(url).pathname : url;
      const method = init?.method ?? "GET";

      if (pathname === "/api/auth/setup/status") return jsonResponse({ initialized: true, firstAdminEmail: "admin@rescuebase.local" });
      if (pathname === "/api/auth/session") {
        return jsonResponse({ user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } });
      }
      if (pathname === "/api/catalog/kits" && method === "GET") return jsonResponse([kit]);
      if (pathname === "/api/catalog/locations") return jsonResponse([kit.location]);
      if (pathname === "/api/catalog/templates") return jsonResponse([kit.template]);

      return new Response(JSON.stringify({ message: `No test route for ${pathname}` }), { status: 404, headers: { "content-type": "application/json" } });
    }));

    await renderAppAt("/admin/kits");
    await screen.findByRole("heading", { level: 1, name: "Rucksäcke" });
    await clickElement(screen.getByRole("button", { name: "Bearbeiten" }));

    const dialog = await screen.findByRole("dialog", { name: "Rucksack bearbeiten" });
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Rucksack Fahrzeug 1");
    expect(within(dialog).getByLabelText("Rucksackkennung")).toHaveValue("SAN-RS-001");
    expect(within(dialog).getByLabelText("Standort")).toHaveValue("loc-rtw-1");
    expect(within(dialog).getByLabelText("Vorlage")).toHaveValue("template-san-a-v1");
  });

  it("soft-deletes kits after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      const pathname = url.startsWith("http") ? new URL(url).pathname : url;
      const method = init?.method ?? "GET";

      if (pathname === "/api/auth/setup/status") return jsonResponse({ initialized: true, firstAdminEmail: "admin@rescuebase.local" });
      if (pathname === "/api/auth/session") return jsonResponse({ user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } });
      if (pathname === "/api/catalog/kits" && method === "GET") return jsonResponse([kit]);
      if (pathname === "/api/catalog/locations") return jsonResponse([kit.location]);
      if (pathname === "/api/catalog/templates") return jsonResponse([kit.template]);
      if (pathname === "/api/catalog/kits/kit-rucksack-1" && method === "DELETE") return jsonResponse({ ok: true });

      return new Response(JSON.stringify({ message: `No test route for ${pathname}` }), { status: 404, headers: { "content-type": "application/json" } });
    }));

    await renderAppAt("/admin/kits");
    await screen.findByRole("heading", { level: 1, name: "Rucksäcke" });
    await clickElement(screen.getByRole("button", { name: /Rucksack Fahrzeug 1 löschen/ }));
    await waitFor(() => expect(wasRequested("/api/catalog/kits/kit-rucksack-1", "DELETE")).toBe(true));
  });

  it("filters kits by URL-backed search values", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      const pathname = url.startsWith("http") ? new URL(url).pathname : url;
      const method = init?.method ?? "GET";

      if (pathname === "/api/auth/setup/status") return jsonResponse({ initialized: true, firstAdminEmail: "admin@rescuebase.local" });
      if (pathname === "/api/auth/session") return jsonResponse({ user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } });
      if (pathname === "/api/catalog/kits" && method === "GET") {
        return jsonResponse([kit, { ...kit, id: "kit-rucksack-2", name: "Reserve Rucksack", code: "SAN-RS-002", status: "NOT_READY" }]);
      }
      if (pathname === "/api/catalog/locations") return jsonResponse([kit.location]);
      if (pathname === "/api/catalog/templates") return jsonResponse([kit.template]);

      return new Response(JSON.stringify({ message: `No test route for ${pathname}` }), { status: 404, headers: { "content-type": "application/json" } });
    }));

    await renderAppAt("/admin/kits?q=Reserve&status=NOT_READY");
    await screen.findByRole("heading", { level: 1, name: "Rucksäcke" });
    expect(screen.getByLabelText("Suche")).toHaveValue("Reserve");
    expect(screen.getByLabelText("Status")).toHaveValue("NOT_READY");
    expect(screen.getByText("Reserve Rucksack")).toBeInTheDocument();
    expect(screen.queryByText("Rucksack Fahrzeug 1")).toBeNull();

    await changeValue(screen.getByLabelText("Suche"), "");
    await clickElement(screen.getByRole("button", { name: "Filter zurücksetzen" }));
    await waitFor(() => expect(getActiveRouter()?.state.location.search).toEqual({}));
    expect(screen.getByText("Rucksack Fahrzeug 1")).toBeInTheDocument();
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
