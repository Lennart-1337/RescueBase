import {
  renderBillingPdf,
  type BillingPdfModel,
} from "../src/services/service-planning/billing/pdf.js";
import { extractVisiblePdfText, normalizePdfText } from "./support/pdf-text.js";

const base: BillingPdfModel = {
  kind: "OFFER",
  number: "006 SAN 2026",
  issuedOn: "2026-10-29",
  validUntil: "2026-11-28",
  recipient: "Sportverein e.V.\nHauptstraße 12\n47506 Neukirchen-Vluyn",
  title: "Sanitätsdienst beim Stadtfest",
  lines: [
    {
      description: "DLRG Sanitäter/-in\n29.10.2026, 14:00-21:00 Uhr",
      quantity: "14 h",
      unitPrice: "14.00",
      amount: "196.00",
    },
  ],
  total: "196.00",
};
function normalized(pdf: Buffer) {
  return normalizePdfText(extractVisiblePdfText(pdf));
}
function pageCount(pdf: Buffer) {
  return (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;
}

describe("service billing PDF", () => {
  it("renders the template letterhead, recipient, numbered offer and 30-day validity", async () => {
    const pdf = await renderBillingPdf(base),
      text = normalized(pdf);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    for (const phrase of [
      "Angebot Nr. 006 SAN 2026",
      "Döpperstraße 47",
      "Sportverein e.V.",
      "28.11.2026",
      "196,00",
    ])
      expect(text).toContain(normalizePdfText(phrase));
    expect(pageCount(pdf)).toBe(1);
  });
  it("renders an invoice with payment terms and no offer validity", async () => {
    const pdf = await renderBillingPdf({
      ...base,
      kind: "INVOICE",
      number: "011-SAN-2026",
      validUntil: null,
    });
    const text = normalized(pdf);
    expect(text).toContain(normalizePdfText("Rechnung Nr. 011-SAN-2026"));
    expect(text).toContain(normalizePdfText("14 Tagen ab Rechnungsdatum"));
    expect(text).not.toContain(normalizePdfText("gültig bis"));
    expect(pageCount(pdf)).toBe(1);
  });
  it("keeps an eight-line recipient and four-decimal hourly prices complete", async () => {
    const recipient = Array.from(
      { length: 8 },
      (_, i) => `Zeile ${i + 1}: ${"Anschrift ".repeat(5)}`,
    ).join("\n");
    expect(recipient.length).toBeLessThanOrEqual(500);
    const pdf = await renderBillingPdf({
      ...base,
      recipient,
      lines: [{ ...base.lines[0]!, unitPrice: "14.1234" }],
    });
    const text = normalized(pdf);
    expect(text).toContain(normalizePdfText("Zeile 8"));
    expect(text).toContain(normalizePdfText("14,1234"));
    expect(text).toContain(normalizePdfText("ohne Unterschrift gültig"));
  });
  it("continues long rows and repeats headers and legal footers on every page", async () => {
    const description = Array.from(
      { length: 180 },
      (_, i) => `Zeile ${i + 1} ausführliche Leistungsbeschreibung`,
    ).join("\n");
    const pdf = await renderBillingPdf({
      ...base,
      lines: [{ ...base.lines[0]!, description }],
    });
    const text = normalized(pdf),
      count = pageCount(pdf);
    expect(count).toBeGreaterThan(2);
    expect(text).toContain(
      normalizePdfText("Zeile 180 ausführliche Leistungsbeschreibung"),
    );
    expect(text.match(/einzelpreis/g)!.length).toBeGreaterThanOrEqual(
      count - 1,
    );
    expect(text.match(/einzelpreis/g)!.length).toBeLessThanOrEqual(count);
    expect(text.match(/sparkasseamniederrhein/g)?.length).toBe(count);
    expect(text).toContain(normalizePdfText("ohne Unterschrift gültig"));
  });
});
