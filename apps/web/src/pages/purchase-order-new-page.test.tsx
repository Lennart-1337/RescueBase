import { screen, waitFor } from "@testing-library/react";
import { article, inventoryTarget, location } from "../test-support/fixtures";
import { changeValue, clickElement, getActiveRouter, mouseDownElement, postedBody, renderAppAt, resetTestBrowser, stubFetch } from "../test-support/app-test-helpers";

describe("PurchaseOrderNewPage", () => {
  afterEach(resetTestBrowser);

  it("offers a back link to the purchase order overview", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/articles": [article],
      "/api/catalog/locations": [location],
      "/api/inventory/targets": [inventoryTarget],
      "/api/purchase-orders": []
    });

    await renderAppAt("/admin/purchase-orders/new");
    await clickElement(await screen.findByRole("link", { name: "Zurück" }));

    await waitFor(() => expect(getActiveRouter()?.state.location.pathname).toEqual("/admin/purchase-orders"));
  });

  it("submits supplier article number and note as separate manual line fields", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/articles": [article],
      "/api/catalog/locations": [location],
      "/api/inventory/targets": [inventoryTarget],
      "/api/purchase-orders": { id: "purchase-order-created" },
      "/api/purchase-orders/purchase-order-created": { id: "purchase-order-created", orderNumber: "PO-2026-000001", supplierName: "MediSafe Einkauf", locationId: "loc-main", status: "DRAFT", notes: null, totalGrossCents: 0, createdAt: "2026-06-27T12:00:00.000Z", updatedAt: "2026-06-27T12:00:00.000Z", location, lines: [], receipts: [] }
    });

    await renderAppAt("/admin/purchase-orders/new");
    await screen.findByRole("heading", { name: "Bestellung anlegen" });

    await changeValue(screen.getByLabelText("Lieferant"), "MediSafe Einkauf");
    await changeValue(screen.getByLabelText("Artikel"), "Verband");
    await mouseDownElement(screen.getByRole("option", { name: "Verbandpäckchen mittel" }));
    await changeValue(screen.getByLabelText("Art.-Nr."), "MS-2000");
    await changeValue(screen.getByLabelText("Notiz"), "Bitte gekühlt liefern");
    await clickElement(screen.getByRole("button", { name: "Entwurf anlegen" }));

    await waitFor(() => expect(postedBody("/api/purchase-orders")).toEqual({
      supplierName: "MediSafe Einkauf",
      locationId: "loc-main",
      lines: [{
        articleId: "article-bandage",
        orderedQuantity: 1,
        grossUnitPriceCents: 0,
        supplierArticleNumber: "MS-2000",
        note: "Bitte gekühlt liefern"
      }]
    }));
  });

  it("animates the mode switch content without losing the shortage controls", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/articles": [article],
      "/api/catalog/locations": [location],
      "/api/inventory/targets": [inventoryTarget],
      "/api/purchase-orders": []
    });

    await renderAppAt("/admin/purchase-orders/new");
    await clickElement(await screen.findByRole("tab", { name: "Aus Fehlmengen" }));

    const shortageHeading = await screen.findByRole("heading", { name: "Fehlmengen" });
    expect(shortageHeading.closest("[data-motion-preset]")).toHaveAttribute("data-motion-preset", "panel-enter");
    expect(screen.getByLabelText("Gruppierung")).toBeInTheDocument();
  });

  it("renders the creation modes above the form using the shared tab style", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/articles": [article],
      "/api/catalog/locations": [location],
      "/api/inventory/targets": [inventoryTarget],
      "/api/purchase-orders": []
    });

    await renderAppAt("/admin/purchase-orders/new");

    expect(await screen.findByRole("tab", { name: "Manuell" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Aus Fehlmengen" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Erstellmodus" })).toBeInTheDocument();
  });

  it("renders the header fields without extra horizontal inset", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/articles": [article],
      "/api/catalog/locations": [location],
      "/api/inventory/targets": [inventoryTarget],
      "/api/purchase-orders": []
    });

    await renderAppAt("/admin/purchase-orders/new");
    await screen.findByRole("heading", { name: "Rahmendaten" });

    expect(document.querySelector(".purchase-order-header-grid")).toBeInTheDocument();
  });
});
