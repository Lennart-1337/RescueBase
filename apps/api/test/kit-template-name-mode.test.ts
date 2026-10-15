import { describe, expect, it, jest } from "@jest/globals";
import { ReportsController } from "../src/modules/reports.controller.js";
import { ReportService } from "../src/services/report.service.js";
import { extractVisiblePdfText, normalizePdfText } from "./support/pdf-text.js";

function position(name: string, shortName?: string | null) {
  return { moduleName: "Beatmung", requiredQuantity: 1, critical: false, article: { name, shortName, unit: "Stück" } };
}
function service(positions = [position("Ambu Einweg Beatmungsbeutel Kinder", "Beatmungsbeutel Kinder")]) {
  return new ReportService({ kitTemplate: { findFirst: async () => ({ id: "template-1", name: "SAN Rucksack", version: 1, positions }) } } as never);
}
describe("kit template PDF article names", () => {
  it("uses short names by default and falls back when missing", async () => {
    const report = service([position("Ambu Einweg Beatmungsbeutel Kinder", "Beatmungsbeutel Kinder"), position("Rettungsdecke"), position("Thermometer", "  ")]);
    const text = normalizePdfText(extractVisiblePdfText(await report.kitTemplatePdf("template-1")));
    expect(text).toContain("beatmungsbeutelkinder");
    expect(text).not.toContain("ambueinweg");
    expect(text).toContain("rettungsdecke");
    expect(text).toContain("thermometer");
  });
  it("allows exporting only the full name", async () => {
    const text = normalizePdfText(extractVisiblePdfText(await service().kitTemplatePdf("template-1", "full")));
    expect(text.match(/beatmungsbeutelkinder/g)).toHaveLength(1);
    expect(text).toContain("ambueinwegbeatmungsbeutelkinder");
  });
  it("renders both names once, suppressing identical short names", async () => {
    const report = service([position("Ambu Einweg Beatmungsbeutel Kinder", "Beatmungsbeutel Kinder"), position("Rettungsdecke", "Rettungsdecke")]);
    const text = normalizePdfText(extractVisiblePdfText(await report.kitTemplatePdf("template-1", "both")));
    expect(text.match(/beatmungsbeutelkinder/g)).toHaveLength(2);
    expect(text.match(/rettungsdecke/g)).toHaveLength(1);
  });
  it("paginates both names without losing rows or repeating module headings", async () => {
    const positions = Array.from({ length: 60 }, (_, index) => position(`Vollständiger Produktname mit zahlreichen Details und langem Herstellertext Nummer ${index + 1}`, `Kurzname ${index + 1}`));
    const pdf = await service(positions).kitTemplatePdf("template-1", "both");
    const text = normalizePdfText(extractVisiblePdfText(pdf));
    expect(text.match(/beatmung/g)).toHaveLength(1);
    for (let index = 1; index <= 60; index++) expect(text).toContain(`kurzname${index}`);
    expect(pdf.toString("latin1").match(/\/Type \/Page\b/g)!.length).toBeGreaterThan(1);
  });
});
describe("kit template PDF name query", () => {
  it.each([undefined, "short", "full", "both"])("passes the selected name mode %s", async (mode) => {
    const kitTemplatePdf = jest.fn(async () => Buffer.from("pdf"));
    const response = { setHeader: jest.fn(), send: jest.fn() };
    await new ReportsController({ kitTemplatePdf } as never).kitTemplate("template-1", mode, response as never);
    expect(kitTemplatePdf).toHaveBeenCalledWith("template-1", mode ?? "short");
  });
  it.each(["", "invalid", ["short", "full"]])("rejects invalid name mode %j", async (mode) => {
    const kitTemplatePdf = jest.fn();
    const controller = new ReportsController({ kitTemplatePdf } as never);
    await expect(controller.kitTemplate("template-1", mode as never, {} as never)).rejects.toMatchObject({ status: 400 });
    expect(kitTemplatePdf).not.toHaveBeenCalled();
  });
});
