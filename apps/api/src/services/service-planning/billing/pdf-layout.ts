import { logo } from "./assets/logo.js";
import {
  billingLabel,
  displayDate,
  type BillingPdfModel,
} from "./pdf-types.js";
export const left = 48,
  width = 499,
  bottom = 725;

export function letterhead(
  doc: PDFKit.PDFDocument,
  model: BillingPdfModel,
  first: boolean,
) {
  if (!first) {
    doc.image(logo, 467, 30, { width: 69 });
    doc
      .fillColor("#111111")
      .font("Helvetica")
      .fontSize(8)
      .text(
        "DLRG Ortsgruppe Neukirchen-Vluyn e.V. · Döpperstraße 47",
        left,
        49,
        { width: 380 },
      );
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(`${billingLabel(model.kind)} Nr. ${model.number}`, left, 121, {
        width,
      });
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(model.title, left, doc.y + 11, { width, lineGap: 2 });
    doc.y += 20;
    return;
  }
  doc.fillColor("#111111").font("Helvetica").fontSize(7);
  doc.text(
    "DLRG · Ortsgruppe Neukirchen-Vluyn e.V. · Döpperstraße 47 · 47506 Neukirchen-Vluyn",
    left,
    113,
    { width: 330 },
  );
  doc.image(logo, 423, 39, { width: 113 });
  doc
    .fontSize(8)
    .text(
      "Landesverband Nordrhein\nBezirk Kreis Wesel\nOrtsgruppe Neukirchen-Vluyn e.V.\nBeauftragte Sanitätsdienste\nDöpperstraße 47\n47506 Neukirchen-Vluyn\n\nleitereinsatz@neukirchen-vluyn.dlrg.de\nneukirchen-vluyn.dlrg.de",
      370,
      150,
      { width: 177, lineGap: 2 },
    );
  let end = 278;
  if (first) {
    doc
      .fontSize(10)
      .text(model.recipient, left, 137, { width: 300, lineGap: 2 });
    end = Math.max(end, doc.y + 22);
  }
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(`Neukirchen-Vluyn, ${displayDate(model.issuedOn)}`, left, end, {
      width,
      align: "right",
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(`${billingLabel(model.kind)} Nr. ${model.number}`, left, end + 24, {
      width,
    });
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(model.title, left, doc.y + 12, { width, lineGap: 2 });
  if (first)
    doc.text(
      model.kind === "OFFER"
        ? "Vielen Dank für Ihre Anfrage. Wir unterbreiten Ihnen folgendes unverbindliches Angebot zur sanitätsdienstlichen Absicherung:"
        : "Nachfolgend stellen wir Ihnen die folgenden Leistungen in Rechnung:",
      left,
      doc.y + 14,
      { width, lineGap: 2 },
    );
  doc.y += 19;
}
