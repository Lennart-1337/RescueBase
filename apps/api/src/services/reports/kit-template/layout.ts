import { drawTableHeader, reportPalette as palette } from "../../report-theme.js";
import type { KitTemplatePdfRecord } from "./positions.js";

export const templateModuleHeaderHeight = 39;

export function templatePositionRowHeight(
  doc: PDFKit.PDFDocument,
  position: KitTemplatePdfRecord["positions"][number],
) {
  return Math.max(
    14,
    doc
      .font("Helvetica")
      .fontSize(9)
      .heightOfString(position.article.name, { width: 290 }),
  );
}

export function drawTemplateModuleHeader(
  doc: PDFKit.PDFDocument,
  y: number,
  moduleName: string,
) {
  doc
    .fillColor(palette.ink)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(moduleName, 48, y, { width: 300 });
  return drawTableHeader(doc, y + 15, [
    { label: "Artikel", x: 48, width: 290 },
    { label: "Soll", x: 344, width: 48, align: "right" },
    { label: "Einheit", x: 402, width: 78 },
    { label: "Hinweis", x: 486, width: 50 },
  ]);
}
