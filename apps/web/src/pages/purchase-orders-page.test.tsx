import { screen, waitFor } from "@testing-library/react";
import { purchaseOrder } from "../test-support/fixtures";
import {
  changeValue,
  clickElement,
  getActiveRouter,
  renderAppAt,
  resetTestBrowser,
  wasRequested,
  stubFetch,
} from "../test-support/app-test-helpers";

describe("PurchaseOrdersPage", () => {
  afterEach(resetTestBrowser);

  it("uses the shared filter toolbar layout and keeps filters in the URL", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false,
        },
      },
      "/api/purchase-orders": [
        purchaseOrder,
        {
          ...purchaseOrder,
          id: "purchase-order-2",
          orderNumber: "PO-2026-000002",
          supplierName: "NordMed",
          status: "RECEIVED",
          totalGrossCents: 1450,
        },
      ],
    });

    await renderAppAt("/admin/purchase-orders");
    await screen.findByRole("heading", { name: "Bestellungen" });

    const toolbar = screen.getByRole("search", { name: "Bestellungen filtern" });
    expect(toolbar).toHaveTextContent("2/2 sichtbar");
    expect(
      screen.getByRole("button", { name: "Filter zurücksetzen" }),
    ).toBeInTheDocument();

    await changeValue(screen.getByLabelText("Suche"), "Nord");
    await waitFor(() =>
      expect(getActiveRouter()?.state.location.search).toMatchObject({
        q: "Nord",
      }),
    );
    expect(screen.getByText("PO-2026-000002")).toBeInTheDocument();
    expect(screen.queryByText("PO-2026-000001")).toBeNull();
    expect(toolbar).toHaveTextContent("1/2 sichtbar");

    await clickElement(
      screen.getByRole("button", { name: "Filter zurücksetzen" }),
    );
    await waitFor(() =>
      expect(getActiveRouter()?.state.location.search).toEqual({}),
    );
    expect(screen.getByText("PO-2026-000001")).toBeInTheDocument();
    expect(screen.getByText("PO-2026-000002")).toBeInTheDocument();
  });

  it("shows archived orders in a separate tab", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false,
        },
      },
      "/api/purchase-orders": [
        purchaseOrder,
        {
          ...purchaseOrder,
          id: "purchase-order-archived",
          orderNumber: "PO-2026-000099",
          archivedAt: "2026-06-28T09:30:00.000Z",
        },
      ],
    });

    await renderAppAt("/admin/purchase-orders");
    await screen.findByRole("heading", { name: "Bestellungen" });

    expect(screen.getByText("PO-2026-000001")).toBeInTheDocument();
    expect(screen.queryByText("PO-2026-000099")).toBeNull();

    await clickElement(screen.getByRole("tab", { name: "Archiviert (1)" }));

    expect(screen.getByText("PO-2026-000099")).toBeInTheDocument();
    expect(screen.queryByText("PO-2026-000001")).toBeNull();
  });

  it("uses an explicit edit action instead of linking the full row", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false,
        },
      },
      "/api/purchase-orders": [purchaseOrder],
    });

    await renderAppAt("/admin/purchase-orders");
    await screen.findByRole("heading", { name: "Bestellungen" });

    expect(screen.getByRole("link", { name: "Bearbeiten" })).toHaveAttribute(
      "href",
      "/admin/purchase-orders/purchase-order-1",
    );
    expect(screen.getByRole("link", { name: "Bearbeiten" })).toHaveClass("purchase-order-detail-button");
    expect(screen.queryByRole("link", { name: /PO-2026-000001/ })).toBeNull();
  });

  it("archives an active order from the list row", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": {
        user: {
          id: "user-admin",
          email: "admin@rescuebase.local",
          displayName: "Admin",
          role: "ADMIN",
          twoFactorEnabled: false,
        },
      },
      "/api/purchase-orders": [purchaseOrder],
      "/api/purchase-orders/purchase-order-1/archive": { ...purchaseOrder, archivedAt: "2026-06-28T10:00:00.000Z" },
    });

    await renderAppAt("/admin/purchase-orders");
    await clickElement(await screen.findByRole("button", { name: "Archivieren" }));

    expect(wasRequested("/api/purchase-orders/purchase-order-1/archive", "POST")).toBe(true);
  });
});
