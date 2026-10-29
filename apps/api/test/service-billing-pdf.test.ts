import PDFDocument from "pdfkit";
import { jest } from "@jest/globals";
import {
  renderBillingPdf,
  type BillingPdfModel,
} from "../src/services/service-planning/billing/pdf.js";
import { normalizePdfText } from "./support/pdf-text.js";
import { inflateSync } from "node:zlib";
import { defaultBillingSettings } from "../src/settings/service-billing/defaults.js";

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
  const source = pdf.toString("latin1");
  const objects = new Map(
    [...source.matchAll(/(\d+) 0 obj\s*([\s\S]*?)endobj/g)].map((match) => [
      match[1]!,
      match[2]!,
    ]),
  );
  const stream = (value: string) => {
    const raw = value.match(/stream\r?\n([\s\S]*?)endstream/)?.[1];
    if (!raw) return "";
    return value.includes("/FlateDecode")
      ? inflateSync(Buffer.from(raw, "latin1")).toString("latin1")
      : raw;
  };
  const fonts = new Map<string, Map<string, string>>();
  for (const match of source.matchAll(/\/(F\d+) (\d+) 0 R/g)) {
    const unicode = objects.get(match[2]!)?.match(/\/ToUnicode (\d+) 0 R/)?.[1];
    if (!unicode) continue;
    const map = new Map<string, string>();
    const cmap = stream(objects.get(unicode)!);
    for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
      for (const pair of block[1]!.matchAll(/<([a-f0-9]+)>\s*<([a-f0-9]+)>/gi))
        map.set(
          pair[1]!.toLowerCase(),
          String.fromCharCode(
            ...(pair[2]!.match(/.{4}/g) ?? []).map((v) => parseInt(v, 16)),
          ),
        );
    for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g))
      for (const range of block[1]!.matchAll(
        /<([a-f0-9]+)>\s*<[a-f0-9]+>\s*\[([^\]]+)\]/gi,
      )) {
        const start = parseInt(range[1]!, 16);
        [...range[2]!.matchAll(/<([a-f0-9]+)>/gi)].forEach((pair, offset) => {
          const value = String.fromCharCode(
            ...(pair[1]!.match(/.{4}/g) ?? []).map((v) => parseInt(v, 16)),
          );
          map.set((start + offset).toString(16).padStart(4, "0"), value);
        });
      }
    fonts.set(match[1]!, map);
  }
  const text: string[] = [];
  for (const object of objects.values()) {
    if (!object.includes("/Filter /FlateDecode")) continue;
    let content: string;
    try {
      content = stream(object);
    } catch {
      continue;
    }
    if (!content.includes("BT")) continue;
    let font = "";
    for (const token of content.matchAll(
      /\/(F\d+) [\d.]+ Tf|<([a-f0-9]+)>/gi,
    )) {
      if (token[1]) font = token[1];
      else if (token[2])
        text.push(
          (token[2].match(/.{4}/g) ?? [])
            .map((code) => fonts.get(font)?.get(code.toLowerCase()) ?? "")
            .join(""),
        );
    }
  }
  return normalizePdfText(text.join(" "));
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
  it("uses central sender, bank, signatory, tax text and payment settings", async () => {
    const settings = {
      ...defaultBillingSettings,
      organizationName: "Rettungsverein Beispiel e.V.",
      city: "Bonn",
      street: "Teststraße 7",
      bankName: "Beispielbank",
      iban: "DE001234",
      signatoryName: "Erika Muster",
      signatoryRole: "Einsatzleitung",
      paymentTermDays: 21,
      taxNote: "Individueller Steuerhinweis",
      offerTerms: "Individuelle Angebotsbedingungen",
      showLogo: false,
    };
    const pdf = await renderBillingPdf({ ...base, settings });
    const text = normalized(pdf);
    for (const phrase of [
      settings.organizationName,
      settings.street,
      settings.city,
      settings.bankName,
      settings.iban,
      settings.signatoryName,
      settings.signatoryRole,
      settings.taxNote,
      settings.offerTerms,
      "21 Tagen",
    ])
      expect(text).toContain(normalizePdfText(phrase));
    expect(pdf.toString("latin1")).not.toContain("/Subtype /Image");
    expect(text).not.toContain(normalizePdfText("Döpperstraße 47"));
  });
  it("keeps a typical grouped offer on one page in the source layout", async () => {
    const pdf = await renderBillingPdf({
      ...base,
      salutation: "Sehr geehrte Frau Grittmann,",
      lines: [
        {
          description: "DLRG Sanitäter/-in",
          date: "13.11.2026",
          duration: "2,5 h\n(17:00-19:30 Uhr)",
          count: "2",
          quantity: "6 h",
          unitPrice: "14.00",
          amount: "84.00",
        },
        {
          description: "Materialpauschale",
          date: "13.11.2026",
          duration: "",
          count: "1",
          quantity: "1",
          unitPrice: "35.00",
          amount: "35.00",
        },
      ],
      total: "119.00",
    });
    expect(pageCount(pdf)).toBe(1);
    const text = normalized(pdf);
    for (const value of [
      "Angebotsdatum",
      "Sehr geehrte Frau Grittmann",
      "Dauer",
      "Anzahl",
      "119,00",
      "Sagt Ihnen unser Angebot zu",
    ])
      expect(text).toContain(normalizePdfText(value));
    expect(text).not.toContain(normalizePdfText(base.title));
  });
  it("keeps maximum-length header, footer and offer terms complete across pages", async () => {
    const settings = {
      ...defaultBillingSettings,
      organizationName: "W".repeat(120),
      organizationDetails: "D".repeat(160),
      department: "E".repeat(80),
      street: "S".repeat(120),
      postalCode: "1234567890123456",
      city: "C".repeat(80),
      email: "e".repeat(120),
      phone: "1".repeat(50),
      website: "w".repeat(200),
      bankName: "B".repeat(120),
      legalDetails: "L".repeat(590) + "LEGALEND",
      footerText: "F".repeat(990) + "FOOTEREND",
      taxNote: "T".repeat(390) + "TAXEND",
      offerTerms: "A".repeat(790) + "TERMSEND",
    };
    const pdf = await renderBillingPdf({ ...base, settings });
    const text = normalized(pdf);
    for (const phrase of [
      "LEGALEND",
      "FOOTEREND",
      "TAXEND",
      "TERMSEND",
      "ohne Unterschrift gültig",
    ])
      expect(text).toContain(normalizePdfText(phrase));
    expect(pageCount(pdf)).toBeGreaterThan(1);
  });
  it("wraps a 64-character offer number inside the right margin and clears a long salutation", async () => {
    const number = "W".repeat(63) + "Z";
    const salutation = "Sehr geehrte " + "W".repeat(115) + " SALUTATIONEND";
    const original = PDFDocument.prototype.text;
    const calls: Array<{ value: string; x: number; y: number; width: number }> =
      [];
    const implementation = function (
      this: PDFKit.PDFDocument,
      ...args: unknown[]
    ) {
      const value = String(args[0]);
      if (
        /^W+Z?$/.test(value) ||
        value === "Angebotsdatum:" ||
        value.includes("SALUTATIONEND") ||
        value.startsWith("Vielen Dank")
      )
        calls.push({
          value,
          x: typeof args[1] === "number" ? args[1] : this.x,
          y: typeof args[2] === "number" ? args[2] : this.y,
          width: this.widthOfString(value),
        });
      return original.apply(this, args as Parameters<typeof original>);
    };
    const spy = jest
      .spyOn(PDFDocument.prototype, "text")
      .mockImplementation(implementation as typeof original);
    try {
      const pdf = await renderBillingPdf({ ...base, number, salutation });
      expect(normalized(pdf)).toContain(normalizePdfText(number));
      expect(normalized(pdf)).toContain("salutationend");
      const numberRuns = calls.filter(
        (call) => /^W+Z?$/.test(call.value) && call.x === 215,
      );
      expect(numberRuns.length).toBeGreaterThan(1);
      expect(numberRuns.map((call) => call.value).join("")).toBe(number);
      expect(numberRuns.every((call) => call.x + call.width <= 547.01)).toBe(
        true,
      );
      expect(
        calls.find((call) => call.value === "Angebotsdatum:")!.y,
      ).toBeGreaterThan(numberRuns.at(-1)!.y + 9);
      expect(
        calls.find((call) => call.value.startsWith("Vielen Dank"))!.y,
      ).toBeGreaterThan(
        calls.find((call) => call.value.includes("SALUTATIONEND"))!.y + 9,
      );
    } finally {
      spy.mockRestore();
    }
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
