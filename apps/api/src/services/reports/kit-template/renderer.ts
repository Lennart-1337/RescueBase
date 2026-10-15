import { templateArticleName, type ArticleNameMode } from "./article-name.js";
import { needsPageBreak } from "../../report-layout.js";
import { drawContinuationHeader, drawDocumentHeader, drawStatStrip, reportPalette as palette } from "../../report-theme.js";
import { drawTemplateModuleHeader, drawTemplateTableHeader, templateModuleStartHeight, templatePositionRowHeight, templatePageReserve, templateContinuationTop } from "./layout.js";
import { groupTemplatePositions, type KitTemplatePdfRecord } from "./positions.js";

export function drawKitTemplate(doc: PDFKit.PDFDocument, template: KitTemplatePdfRecord, mode: ArticleNameMode = "short") {
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
        requiredHeight: templateModuleStartHeight(doc, group.positions, mode),
        pageHeight: doc.page.height,
        bottomMargin: doc.page.margins.bottom,
        reserve: templatePageReserve,
      })
    ) {
      doc.addPage();
      drawContinuationHeader(
        doc,
        template.name,
        `Version ${template.version} · Inhaltsliste`,
      );
      y = templateContinuationTop;
    }
    y = drawTemplateModuleHeader(doc, y, group.name);
    for (const position of group.positions) {
      const rowHeight = templatePositionRowHeight(doc, position, mode);
      if (
        needsPageBreak({
          currentY: y,
          requiredHeight: rowHeight + 10,
          pageHeight: doc.page.height,
          bottomMargin: doc.page.margins.bottom,
          reserve: templatePageReserve,
        })
      ) {
        doc.addPage();
        drawContinuationHeader(
          doc,
          template.name,
          `Version ${template.version} · Inhaltsliste`,
        );
        y = drawTemplateTableHeader(doc, templateContinuationTop);
      }
      doc
        .fillColor(palette.ink)
        .font("Helvetica")
        .fontSize(9)
        .text(templateArticleName(position.article, mode), 48, y, { width: 290 });
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
