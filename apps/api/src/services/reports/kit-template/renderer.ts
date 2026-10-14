import { needsPageBreak } from "../../report-layout.js";
import { drawContinuationHeader, drawDocumentHeader, drawStatStrip, reportPalette as palette } from "../../report-theme.js";
import { drawTemplateModuleHeader, templatePositionRowHeight } from "./layout.js";
import { groupTemplatePositions, type KitTemplatePdfRecord } from "./positions.js";

export function drawKitTemplate(doc: PDFKit.PDFDocument, template: KitTemplatePdfRecord) {
  const groups = groupTemplatePositions(template.positions);
  drawDocumentHeader(
    doc,
    "Rucksackvorlage",
    template.name,
    `Version ${template.version} · ${template.positions.length} Positionen`,
  );
  drawStatStrip(doc, [
    `${new Set(groups.map((group) => group.name)).size} Module`,
    `${template.positions.length} Positionen`,
    `${template.positions.filter((position) => position.critical).length} kritisch`,
  ]);

  let y = doc.y + 12;
  for (const group of groups) {
    if (
      needsPageBreak({
        currentY: y,
        requiredHeight: 46,
        pageHeight: doc.page.height,
        bottomMargin: doc.page.margins.bottom,
        reserve: 8,
      })
    ) {
      doc.addPage();
      drawContinuationHeader(
        doc,
        template.name,
        `Version ${template.version} · Inhaltsliste`,
      );
      y = doc.y + 12;
    }
    y = drawTemplateModuleHeader(doc, y, group.name);
    for (const position of group.positions) {
      const rowHeight = templatePositionRowHeight(doc, position);
      if (
        needsPageBreak({
          currentY: y,
          requiredHeight: rowHeight + 10,
          pageHeight: doc.page.height,
          bottomMargin: doc.page.margins.bottom,
          reserve: 8,
        })
      ) {
        doc.addPage();
        drawContinuationHeader(
          doc,
          template.name,
          `Version ${template.version} · ${group.name}`,
        );
        y = drawTemplateModuleHeader(doc, doc.y + 12, group.name);
      }
      doc
        .fillColor(palette.ink)
        .font("Helvetica")
        .fontSize(9)
        .text(position.article.name, 48, y, { width: 290 });
      doc.text(String(position.requiredQuantity), 344, y, {
        width: 48,
        align: "right",
      });
      doc.text(position.article.unit, 402, y, { width: 78 });
      if (position.critical)
        doc
          .fillColor(palette.critical)
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("Kritisch", 486, y + 1, { width: 50 });
      doc
        .moveTo(48, y + rowHeight + 5)
        .lineTo(doc.page.width - 48, y + rowHeight + 5)
        .strokeColor(palette.line)
        .stroke();
      y += rowHeight + 10;
    }
    y += 12;
  }
}
