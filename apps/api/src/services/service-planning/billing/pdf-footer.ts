import { billingSettings, type BillingPdfModel } from "./pdf-types.js";
import { fixedLines, wrap } from "./pdf-text.js";
export interface BillingGeometry {
  left: number;
  width: number;
  bottom: number;
  footerTop: number;
  footerLines: string[][];
  footerWidth: number;
}
export function geometry(
  doc: PDFKit.PDFDocument,
  model: BillingPdfModel,
): BillingGeometry {
  const settings = billingSettings(model),
    left = model.kind === "OFFER" ? 70 : 48;
  const width = 547 - left,
    footerWidth = (width - 24) / 3;
  const bank = [
    settings.bankName,
    `IBAN: ${settings.iban.replace(/\s/g, "").replace(/(.{4})(?=.)/g, "$1 ")}`,
    settings.bic ? `BIC: ${settings.bic}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  doc.font("BillingRegular").fontSize(6);
  const footerLines = [bank, settings.legalDetails, settings.footerText].map(
    (text) => wrap(doc, text, footerWidth),
  );
  const height = Math.max(...footerLines.map((lines) => lines.length)) * 7.5;
  const footerTop = Math.min(
    model.kind === "OFFER" ? 770 : 755,
    doc.page.height - 28 - height,
  );
  return {
    left,
    width,
    bottom: footerTop - 24,
    footerTop,
    footerLines,
    footerWidth,
  };
}
export function footer(
  doc: PDFKit.PDFDocument,
  layout: BillingGeometry,
  page: number,
  pages: number,
) {
  doc.font("BillingRegular").fontSize(6).fillColor("#111111");
  layout.footerLines.forEach((lines, index) =>
    fixedLines(
      doc,
      lines,
      layout.left + index * (layout.footerWidth + 12),
      layout.footerTop,
      layout.footerWidth,
      7.5,
    ),
  );
  if (pages > 1)
    doc.fontSize(7).text(`Seite ${page} von ${pages}`, layout.left, 827, {
      width: layout.width,
      align: "right",
      lineBreak: false,
    });
}
