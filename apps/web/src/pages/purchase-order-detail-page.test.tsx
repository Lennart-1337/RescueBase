import { screen, within } from "@testing-library/react";
import { purchaseOrder } from "../test-support/fixtures";
import { changeValue, clickElement, renderAppAt, requestBody, stubFetch } from "../test-support/app-test-helpers";

describe("Purchase order detail", () => {
  it("submits a full draft update before approval", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true, appName: "RescueBase Pro", appSubtitle: "Bereitschaft Nord" },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false }, appName: "RescueBase Pro", appSubtitle: "Bereitschaft Nord" },
      "/api/purchase-orders/purchase-order-1": purchaseOrder,
      "/api/catalog/articles": [{
        id: "article-bandage",
        name: "Verbandpäckchen mittel",
        unit: "Stück",
        manufacturer: "MediSafe",
        manufacturerPartNumber: "VB-1000",
        barcode: "040000000001",
        defaultGrossPriceCents: 249
      }],
      "/api/catalog/locations": [{ id: "loc-main", name: "Hauptlager" }]
    });

    await renderAppAt("/admin/purchase-orders/purchase-order-1");
    await clickElement(await screen.findByRole("button", { name: "Bestellung bearbeiten" }));
    const dialog = await screen.findByRole("dialog", { name: "Bestellung bearbeiten" });
    const [supplierInput] = within(dialog).getAllByRole("textbox");
    if (!supplierInput) throw new Error("Supplier input not found");
    await changeValue(supplierInput, "Neue MediSafe GmbH");
    await changeValue(within(dialog).getByDisplayValue("4"), "6");
    await changeValue(within(dialog).getByDisplayValue("2.49"), "12,49");
    await clickElement(within(dialog).getByRole("button", { name: "Bestellung speichern" }));

    expect(requestBody("/api/purchase-orders/purchase-order-1", "PATCH")).toEqual({
      supplierName: "Neue MediSafe GmbH",
      locationId: "loc-main",
      notes: "Bitte gesammelt liefern.",
      lines: [{
        articleId: "article-bandage",
        orderedQuantity: 6,
        grossUnitPriceCents: 1249,
        note: undefined,
        supplierArticleNumber: "VB-1000"
      }]
    });
  });
});
