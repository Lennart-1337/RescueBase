import { describe, expect, it } from "@jest/globals";
import { extractVisiblePdfText, normalizePdfText } from "./support/pdf-text.js";
import { ReportService } from "../src/services/report.service.js";

describe("report service", () => {
  it("renders kit templates as a compact table grouped by module", async () => {
    const service = new ReportService({
      kitTemplate: {
        findFirst: async () => ({
          id: "template-1",
          name: "Sanitätsrucksack A",
          version: 3,
          positions: [
            { moduleName: "Atmung", requiredQuantity: 1, critical: false, article: { name: "Guedel-Tubus", unit: "Stück" } },
            { moduleName: "Verband", requiredQuantity: 2, critical: true, article: { name: "Verbandpäckchen", unit: "Stück" } },
            { moduleName: "Verband", requiredQuantity: 4, critical: false, article: { name: "Kompressen", unit: "Packung" } },
          ],
        }),
      },
    } as never);

    const pdf = await service.kitTemplatePdf("template-1");
    const text = normalizePdfText(extractVisiblePdfText(pdf));

    expect(text).toContain("sanitätsrucksacka");
    expect(text).toContain("version3");
    expect(text).toContain("atmung");
    expect(text).toContain("verband");
    expect(text).toContain("guedel-tubus");
    expect(text).toContain("verbandpäckchen");
    expect(text).toContain("kritisch");
    expect(text.indexOf("atmung")).toBeLessThan(text.indexOf("verband"));
  });

  it("renders purchase orders as a formal letter with supplier contact details", async () => {
    const service = new ReportService({
      purchaseOrder: {
        findUnique: async () => ({
          id: "purchase-order-1",
          orderNumber: "PO-2026-000001",
          supplierName: "MediSafe Einkauf",
          status: "DRAFT",
          notes: "Bitte gesammelt liefern.",
          approvedAt: null,
          approvedByName: null,
          createdAt: new Date("2026-07-08T08:15:00.000Z"),
          location: { name: "Hauptlager" },
          supplier: {
            name: "MediSafe Einkauf",
            contactPerson: "Anna Meier",
            email: "einkauf@medisafe.example",
            phone: "+49 40 123456",
            website: "https://medisafe.example",
            street: "Musterstraße 5",
            postalCode: "20095",
            city: "Hamburg",
            country: "Deutschland",
          },
          lines: [
            {
              articleNameSnapshot: "Verbandpäckchen mittel",
              supplierArticleNumberSnapshot: "VB-1000",
              articleUrlSnapshot:
                "https://shop.example.org/articles/verbandpaeckchen-mittel",
              grossUnitPriceCents: 249,
              orderedQuantity: 4,
              receivedQuantity: 0,
              unitSnapshot: "Stück",
              note: "Bitte steril verpackt liefern.",
            },
          ],
        }),
      },
    } as never);

    const pdf = await service.purchaseOrderPdf("purchase-order-1", {
      includeLineNotes: true,
    });
    const text = normalizePdfText(extractVisiblePdfText(pdf));

    expect(text).toContain("medisafeeinkauf");
    expect(text).toContain("annameier");
    expect(text).toContain("einkauf@medisafe.example");
    expect(text).toContain("+4940123456");
    expect(text).toContain("musterstraße5");
    expect(text).toContain("20095hamburg");
    expect(text).toContain("deutschland");
    expect(text).toContain("bestellnummer");
    expect(text).toContain("lieferadresse");
    expect(text).toContain("hiermitbestellenwir");
    expect(text).toContain("bittegesammeltliefern.");
  });
});
