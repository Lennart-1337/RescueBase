import { screen, waitFor, within } from "@testing-library/react";
import { batch, kit, order, purchaseOrder } from "./test-support/fixtures";
import { createAppRouter } from "./App";
import {
  clickElement,
  renderAppAt,
  resetTestBrowser,
  stubFetch,
} from "./test-support/app-test-helpers";

describe("RescueBase routes", () => {
  afterEach(resetTestBrowser);

  it("uses intent preloading for route links", () => {
    const router = createAppRouter();

    expect(router.options.defaultPreload).toBe("intent");
  });

  it("shows the rescue-themed not-found page for unknown routes", async () => {
    await renderAppAt("/einsatzleitung/vermisst");

    expect(await screen.findByRole("heading", { name: "Dieser Bestandseintrag existiert nicht." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zur Übersicht" })).toHaveAttribute("href", "/");
    expect(document.title).toBe("Seite nicht gefunden | RescueBase");
  });

  it("renders the admin dashboard from routed API data", async () => {
    stubFetch({
      "/api/auth/setup/status": {
        initialized: true,
        appName: "RescueBase Pro",
        appSubtitle: "Bereitschaft Nord",
        showLogo: true,
        showAppName: false,
        showAppSubtitle: true,
      },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false,
        },
        appName: "RescueBase Pro",
        appSubtitle: "Bereitschaft Nord",
        showLogo: true,
        showAppName: false,
        showAppSubtitle: true,
      },
      "/api/catalog/kits": [kit],
      "/api/inventory/batches": [batch],
      "/api/replenishment-orders": [order],
    });
    await renderAppAt("/");
    expect(await screen.findByText("Bereitschaft Nord")).toBeInTheDocument();
    expect(screen.getByAltText("DLRG Logo")).toBeInTheDocument();
    expect(document.querySelector(".sidebar-main")).not.toBeNull();
    expect(document.querySelector(".sidebar-user")).not.toBeNull();
    expect(
      await screen.findByRole("heading", { name: "Nachfüllaufträge" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Rucksack Fahrzeug 1/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 Positionen · Offen")).toBeInTheDocument();
    expect(screen.queryByText(/CSV/)).not.toBeInTheDocument();
    expect(document.title).toBe("Nachfüllaufträge | RescueBase");
  });

  it("opens the mobile navigation in a drawer", async () => {
    stubFetch({
      "/api/auth/setup/status": {
        initialized: true,
        appName: "RescueBase Pro",
        appSubtitle: "Bereitschaft Nord",
        showLogo: true,
        showAppName: false,
        showAppSubtitle: true,
      },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false,
        },
        appName: "RescueBase Pro",
        appSubtitle: "Bereitschaft Nord",
        showLogo: true,
        showAppName: false,
        showAppSubtitle: true,
      },
      "/api/catalog/kits": [kit],
      "/api/inventory/batches": [batch],
      "/api/replenishment-orders": [order],
    });

    await renderAppAt("/");
    await screen.findByRole("heading", { name: "Nachfüllaufträge" });

    await clickElement(screen.getByRole("button", { name: "Menü öffnen" }));

    const drawer = await screen.findByRole("dialog", { name: "Navigation" });
    expect(drawer).toHaveClass("mobile-drawer");
    expect(drawer).toHaveAttribute("data-motion-preset", "slide-left");
    expect(
      screen.getByRole("button", { name: "Menü schließen" }),
    ).toBeInTheDocument();
    expect(
      within(drawer).getByRole("link", { name: "Rucksäcke" }),
    ).toBeInTheDocument();

    await clickElement(screen.getByRole("button", { name: "Menü schließen" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Navigation" })).toBeNull(),
    );
  });

  it("renders the purchase-order list from the Bestellungen route", async () => {
    stubFetch({
      "/api/auth/setup/status": {
        initialized: true,
        appName: "RescueBase Pro",
        appSubtitle: "Bereitschaft Nord",
        showLogo: true,
        showAppName: false,
        showAppSubtitle: true,
      },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false,
        },
        appName: "RescueBase Pro",
        appSubtitle: "Bereitschaft Nord",
        showLogo: true,
        showAppName: false,
        showAppSubtitle: true,
      },
      "/api/purchase-orders": [purchaseOrder],
    });

    await renderAppAt("/admin/purchase-orders");

    expect(
      await screen.findByRole("heading", { name: "Bestellungen" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Bestellungen/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("PO-2026-000001")).toBeInTheDocument();
    expect(screen.getByText(/MediSafe Einkauf/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /PDF/ })).toHaveAttribute(
      "href",
      "/api/reports/purchase-orders/purchase-order-1.pdf",
    );
  });

  it("renders the purchase-order detail without duplicating the admin sidebar", async () => {
    stubFetch({
      "/api/auth/setup/status": {
        initialized: true,
        appName: "RescueBase Pro",
        appSubtitle: "Bereitschaft Nord",
        showLogo: true,
        showAppName: false,
        showAppSubtitle: true,
      },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false,
        },
        appName: "RescueBase Pro",
        appSubtitle: "Bereitschaft Nord",
        showLogo: true,
        showAppName: false,
        showAppSubtitle: true,
      },
      "/api/purchase-orders/purchase-order-1": purchaseOrder,
      "/api/purchase-orders": [purchaseOrder],
    });

    await renderAppAt("/admin/purchase-orders/purchase-order-1");

    expect(
      await screen.findByRole("heading", { name: "PO-2026-000001" }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll(".sidebar")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: /Freigeben/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zurück" })).toHaveAttribute(
      "href",
      "/admin/purchase-orders",
    );
    expect(document.title).toBe("PO-2026-000001 | RescueBase");
  });

  it("renders the public check route from the token path", async () => {
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
              critical: false,
            },
            {
              id: "pos-tourniquet",
              articleId: "article-tourniquet",
              articleName: "Tourniquet",
              moduleName: "Blutung",
              requiredQuantity: 1,
              unit: "Stück",
              critical: true,
            },
            {
              id: "pos-dreiecktuch",
              articleId: "article-dreiecktuch",
              articleName: "Dreiecktuch",
              moduleName: "Verband",
              requiredQuantity: 2,
              unit: "Stück",
              critical: false,
            },
          ],
        },
      },
    });
    await renderAppAt("/check/SAN-RS-001-ZUGANG-2026");
    expect(
      await screen.findByRole("heading", { name: "Rucksack Fahrzeug 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Verband" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Blutung" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Soll: 6 Stück")).toBeInTheDocument();
    expect(screen.getByText("Soll: 1 Stück · kritisch")).toBeInTheDocument();
    expect(document.title).toBe("Rucksack Fahrzeug 1 | RescueBase");
  });

  it("renders the imprint page without authentication", async () => {
    await renderAppAt("/legal/imprint");

    expect(
      await screen.findByRole("heading", { name: "Impressum" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Angaben gemäß § 5 DDG" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Deutsche Lebens-Rettungs-Gesellschaft"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "info@neukirchen-vluyn.dlrg.de" }),
    ).toHaveAttribute("href", "mailto:info@neukirchen-vluyn.dlrg.de");
    expect(document.title).toBe("Impressum | RescueBase");
  });

  it("renders the privacy page without authentication", async () => {
    await renderAppAt("/legal/privacy");

    expect(
      await screen.findByRole("heading", { name: "Datenschutzerklärung" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "1. Verantwortlicher" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Dieses Webportal dient ausschließlich der internen Organisation/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Recht auf Datenübertragbarkeit"),
    ).toBeInTheDocument();
    expect(document.title).toBe("Datenschutzerklärung | RescueBase");
  });

  it("does not render seeded fallback data when the API is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    await renderAppAt("/");
    expect(
      await screen.findByRole("heading", { name: "API nicht verfügbar" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("Rucksack Fahrzeug 1")).not.toBeInTheDocument(),
    );
  });
});
