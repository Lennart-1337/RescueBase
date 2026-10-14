import { drawTableHeader, reportPalette as palette } from "../../report-theme.js";
import type { KitTemplatePdfRecord } from "./positions.js";

export const templateModuleHeaderHeight = 39;
export const templatePageReserve = 8;
// Continuation document header ends at 102 pt, followed by a 12 pt gap.
export const templateContinuationTop = 114;

export function templateModuleStartHeight(doc: PDFKit.PDFDocument, positions: KitTemplatePdfRecord["positions"]) {
  const rowHeights = positions.map((position) => templatePositionRowHeight(doc, position) + 10);
  const fullHeight = templateModuleHeaderHeight + rowHeights.reduce((sum, height) => sum + height, 0);
  const pageCapacity = doc.page.height - doc.page.margins.bottom - templatePageReserve - templateContinuationTop;
  return fullHeight <= pageCapacity ? fullHeight : templateModuleHeaderHeight + (rowHeights[0] ?? 0);
}

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
  return drawTemplateTableHeader(doc, y + 15);
}

export function drawTemplateTableHeader(doc: PDFKit.PDFDocument, y: number) {
  return drawTableHeader(doc, y, [
    { label: "Artikel", x: 48, width: 290 },
    { label: "Soll", x: 344, width: 48, align: "right" },
    { label: "Einheit", x: 402, width: 78 },
    { label: "Hinweis", x: 486, width: 50 },
  ]);
}
