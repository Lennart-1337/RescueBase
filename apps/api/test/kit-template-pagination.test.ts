import { describe, expect, it } from "@jest/globals";
import { ReportService } from "../src/services/report.service.js";
import { extractVisiblePdfText, normalizePdfText } from "./support/pdf-text.js";

function position(moduleName: string, name: string) {
  return { moduleName, requiredQuantity: 1, critical: true, article: { name, unit: "Stück" } };
}

async function render(positions: ReturnType<typeof position>[]) {
  const service = new ReportService({ kitTemplate: { findFirst: async () => ({
    id: "template-1", name: "Neuer großer SAN Rucksack", version: 3, positions,
  }) } } as never);
  const pdf = await service.kitTemplatePdf("template-1");
  return { text: normalizePdfText(extractVisiblePdfText(pdf)),
    pages: pdf.toString("latin1").match(/\/Type \/Page\b/g)!.length };
}

describe("kit template PDF pagination", () => {
  it("moves a complete module to the next page when its remaining rows would otherwise split", async () => {
    const positions = Array.from({ length: 20 }, (_, index) => position("Diagnostik", `Messgerät ${index + 1}`));
    const masks = [
      "Ambu® Einweg Beatmungsmaske / Gesichtsmaske PLUS | Erwachsene | Größe: Groß",
      "Ambu® Einweg Beatmungsmaske / Gesichtsmaske PLUS | Kleinkinder",
      "Ambu® Einweg Beatmungsmaske / Gesichtsmaske PLUS | Neugeborene",
    ];
    positions.push(...masks.map((name) => position("Beatmung", name)));
    const { text, pages } = await render(positions);
    expect(pages).toBe(2);
    expect(text.match(/beatmung(?=artikel)/g)).toHaveLength(1);
    expect(text.indexOf("beatmungartikel")).toBeGreaterThan(text.lastIndexOf("neuergroßersanrucksack"));
    for (const mask of masks) expect(text).toContain(normalizePdfText(mask));
  });

  it("moves a module heading together with its first wrapped article to the next page", async () => {
    const positions = Array.from({ length: 21 }, (_, index) => position("Diagnostik", `Messgerät ${index + 1}`));
    positions.push(position("Dokumentation", "Läufer Formularhalter / Klemmbrett Safety mit Aufbewahrungsfach | Farbe: Neonorange"));
    positions.push(position("Dokumentation", "Thieme Dokumentationsblätter"));
    const { text, pages } = await render(positions);
    expect(pages).toBe(2);
    expect(text.match(/dokumentation(?=artikel)/g)).toHaveLength(1);
    expect(text.match(/dokumentation/g)).toHaveLength(2); // Module heading and article name only.
    expect(text).toContain("thieme");
  });

  it("continues oversized modules with table headings without repeating the module name", async () => {
    const { text, pages } = await render(Array.from({ length: 60 }, (_, index) => position("Dokumentation", `Formular ${index + 1}`)));
    expect(pages).toBeGreaterThan(1);
    expect(text.match(/dokumentation/g)).toHaveLength(1);
    expect(text.match(/artikelsolleinheithinweis/g)).toHaveLength(pages);
    expect(text).toContain("formular60");
  });
});
