import {
  billingSettings,
  displayDate,
  type BillingPdfModel,
} from "./pdf-types.js";
import type { BillingGeometry } from "./pdf-footer.js";
import { fixedLines, text, wrap } from "./pdf-text.js";
export function introduction(
  doc: PDFKit.PDFDocument,
  model: BillingPdfModel,
  layout: BillingGeometry,
  blockEnd: number,
) {
  const settings = billingSettings(model),
    offer = model.kind === "OFFER",
    x = layout.left;
  const longDate = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${model.issuedOn}T12:00:00Z`));
  // Date is right-aligned in the original letterhead.
  doc
    .font("BillingRegular")
    .fontSize(9)
    .text(
      offer ? longDate : `${settings.city}, ${displayDate(model.issuedOn)}`,
      x,
      blockEnd,
      { width: layout.width, align: "right", lineBreak: false },
    );
  if (offer) {
    doc
      .font("BillingBold")
      .fontSize(10)
      .text("Angebot Nr.", x, blockEnd + 13, { lineBreak: false });
    const numberLines = wrap(
      doc,
      model.number,
      layout.left + layout.width - 215,
    );
    fixedLines(
      doc,
      numberLines,
      215,
      blockEnd + 13,
      layout.left + layout.width - 215,
      12,
    );
    const extra = (numberLines.length - 1) * 12;
    text(doc, "Angebotsdatum:", x, blockEnd + 26 + extra, 140, 9);
    text(doc, displayDate(model.issuedOn), 215, blockEnd + 26 + extra, 150, 9);
    text(
      doc,
      model.salutation || "Sehr geehrte Damen und Herren,",
      x,
      blockEnd + 51 + extra,
      layout.width,
      9,
    );
    text(
      doc,
      `Vielen Dank für Ihre Anfrage bezüglich einer sanitätsdienstlichen Absicherung durch die ${settings.organizationName}.\nWir möchten Ihnen folgendes Angebot unverbindlich unterbreiten:`,
      x,
      doc.y + 13,
      layout.width,
      9,
      12,
    );
  } else {
    doc
      .font("BillingBold")
      .fontSize(13)
      .text(`Rechnung Nr. ${model.number}`, x, blockEnd + 24, {
        width: layout.width,
      });
    text(doc, model.title, x, doc.y + 12, layout.width, 10);
    text(
      doc,
      model.salutation || "Sehr geehrte Damen und Herren,",
      x,
      doc.y + 12,
      layout.width,
      9,
    );
    text(
      doc,
      "Nachfolgend stellen wir Ihnen die folgenden Leistungen in Rechnung:",
      x,
      doc.y + 12,
      layout.width,
      9,
    );
  }
  doc.y += offer ? 19 : 15;
}
