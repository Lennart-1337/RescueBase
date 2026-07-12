import { describe, expect, it } from "@jest/globals";
import { inflateSync } from "node:zlib";
import { ReportService } from "../src/services/report.service.js";

function inflatePdfStreams(pdf: Buffer) {
  const content = pdf.toString("latin1");
  const decoded: string[] = [];
  let cursor = 0;
  while (cursor < content.length) {
    const filterIndex = content.indexOf("/Filter /FlateDecode", cursor);
    if (filterIndex === -1) break;
    const streamIndex = content.indexOf("stream", filterIndex);
    const endStreamIndex = content.indexOf("endstream", streamIndex);
    if (streamIndex === -1 || endStreamIndex === -1) break;
    let dataStart = streamIndex + 6;
    if (pdf[dataStart] === 0x0d && pdf[dataStart + 1] === 0x0a) dataStart += 2;
    else if (pdf[dataStart] === 0x0a) dataStart += 1;
    const dataEnd = pdf[endStreamIndex - 1] === 0x0d && pdf[endStreamIndex - 2] !== 0x0a ? endStreamIndex - 1 : endStreamIndex;
    try {
      decoded.push(inflateSync(pdf.subarray(dataStart, dataEnd)).toString("utf8"));
    } catch {
      // Ignore non-content streams.
    }
    cursor = endStreamIndex + 9;
  }
  return decoded.join("\n");
}

function extractVisiblePdfText(pdf: Buffer) {
  return inflatePdfStreams(pdf)
    .split(/\r?\n/)
    .flatMap((line) => {
      const hexMatches = [...line.matchAll(/<([0-9A-Fa-f]+)>/g)].map((match) =>
        Buffer.from(match[1] ?? "", "hex").toString("latin1"),
      );
      const literalMatches = [...line.matchAll(/\(([^()]*)\)/g)].map(
        (match) => match[1] ?? "",
      );
      return [...hexMatches, ...literalMatches];
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePdfText(text: string) {
  return text
    .toLocaleLowerCase("de-DE")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}@.+:/-]+/gu, "");
}

describe("report service", () => {
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
