import { describe, expect, it, jest } from "@jest/globals";
import { ReportService } from "../src/services/report.service.js";
import { extractVisiblePdfText, normalizePdfText } from "./support/pdf-text.js";

function position(moduleName: string | null, name: string) {
  return { moduleName, requiredQuantity: 1, critical: false, article: { name, unit: "Stück" } };
}

function setup(positions: ReturnType<typeof position>[]) {
  const findFirst = jest.fn(async () => ({ id: "template-1", name: "Sanitätsrucksack", version: 2, positions }));
  return { findFirst, service: new ReportService({ kitTemplate: { findFirst } } as never) };
}

describe("kit template PDF order", () => {
  it("loads positions in their saved template order", async () => {
    const { service, findFirst } = setup([]);
    await service.kitTemplatePdf("template-1");
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "template-1", deletedAt: null },
      include: { positions: { include: { article: true }, orderBy: { sortOrder: "asc" } } },
    });
  });

  it("preserves module and article order instead of sorting alphabetically", async () => {
    const { service } = setup([
      position("Diagnostik", "Zweites Messgerät"),
      position("Diagnostik", "Erstes Messgerät"),
      position("Atmung", "Beatmungsbeutel"),
    ]);
    const text = normalizePdfText(extractVisiblePdfText(await service.kitTemplatePdf("template-1")));
    expect(text.indexOf("diagnostik")).toBeLessThan(text.indexOf("atmung"));
    expect(text.indexOf("zweitesmessgerät")).toBeLessThan(text.indexOf("erstesmessgerät"));
  });

  it("preserves all positions across page breaks", async () => {
    const labels = Array.from({ length: 65 }, (_, index) => `Position ${String(65 - index).padStart(3, "0")}`);
    const { service } = setup(labels.map((label, index) => position(index % 2 ? "Atmung" : "Diagnostik", label)));
    const pdf = await service.kitTemplatePdf("template-1");
    expect(pdf.toString("latin1").match(/\/Type \/Page\b/g)!.length).toBeGreaterThan(1);
    const text = normalizePdfText(extractVisiblePdfText(pdf));
    const offsets = labels.map((label) => text.indexOf(normalizePdfText(label)));
    expect(offsets.every((offset) => offset >= 0)).toBe(true);
    for (let index = 1; index < offsets.length; index++) expect(offsets[index - 1]!).toBeLessThan(offsets[index]!);
  });

  it("keeps interleaved modules and positions without a module in their exact order", async () => {
    const { service } = setup([
      position("Diagnostik", "Thermometer"),
      position("Atmung", "Beatmungsbeutel"),
      position("Diagnostik", "Pulsoximeter"),
      position("  ", "Rettungsdecke"),
    ]);
    const text = normalizePdfText(extractVisiblePdfText(await service.kitTemplatePdf("template-1")));
    const labels = ["thermometer", "beatmungsbeutel", "pulsoximeter", "rettungsdecke"];
    for (const label of labels) expect(text).toContain(label);
    for (let index = 1; index < labels.length; index++) {
      expect(text.indexOf(labels[index - 1]!)).toBeLessThan(text.indexOf(labels[index]!));
    }
    expect(text).toContain("ohnemodul");
    expect(text.match(/diagnostik/g)).toHaveLength(2);
    expect(text).toContain("3module");
  });
});
