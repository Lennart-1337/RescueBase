import { logo } from "./assets/logo.js";
import {
  billingLabel,
  billingSettings,
  type BillingPdfModel,
} from "./pdf-types.js";
import type { BillingGeometry } from "./pdf-footer.js";
import { text } from "./pdf-text.js";
import { firstHeader } from "./pdf-header-contact.js";
import { introduction } from "./pdf-introduction.js";
export const left = 48,
  width = 499;
export function letterhead(
  doc: PDFKit.PDFDocument,
  model: BillingPdfModel,
  first: boolean,
  layout: BillingGeometry,
) {
  const settings = billingSettings(model),
    x = layout.left;
  const sender = `${settings.organizationName} · ${settings.street} · ${settings.postalCode} ${settings.city}`;
  if (!first) {
    if (settings.showLogo) doc.image(logo, 467, 30, { width: 69 });
    text(doc, sender, x, 45, layout.width - (settings.showLogo ? 90 : 0), 7);
    doc
      .font("BillingBold")
      .fontSize(11)
      .text(`${billingLabel(model.kind)} Nr. ${model.number}`, x, 115, {
        width: layout.width,
      });
    doc.y += 18;
    return;
  }
  let blockEnd = firstHeader(doc, model, layout, sender);
  if (blockEnd + 150 > layout.bottom) {
    doc.addPage();
    letterhead(doc, model, false, layout);
    blockEnd = doc.y;
  }
  introduction(doc, model, layout, blockEnd);
}
