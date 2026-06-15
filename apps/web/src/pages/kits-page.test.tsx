import { screen, waitFor, within } from "@testing-library/react";
import { kit } from "../test-support/fixtures";
import { clickElement, renderAppAt, resetTestBrowser } from "../test-support/app-test-helpers";

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
    await screen.findByRole("heading", { name: "Rucksäcke" });

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
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
