import { logo } from "./assets/logo.js";
import { billingSettings, type BillingPdfModel } from "./pdf-types.js";
import type { BillingGeometry } from "./pdf-footer.js";
import { text, wrap } from "./pdf-text.js";
export function firstHeader(
  doc: PDFKit.PDFDocument,
  model: BillingPdfModel,
  layout: BillingGeometry,
  sender: string,
) {
  const settings = billingSettings(model),
    offer = model.kind === "OFFER",
    x = layout.left;
  const senderEnd = text(
    doc,
    sender,
    x,
    offer ? 55 : 113,
    offer ? 320 : 300,
    6,
  );
  const recipientEnd = text(
    doc,
    model.recipient,
    x,
    Math.max(offer ? 85 : 137, senderEnd + 12),
    offer ? 300 : 290,
    10,
  );
  if (settings.showLogo)
    doc.image(logo, offer ? 390 : 423, offer ? 55 : 39, { width: 113 });
  const contact = [
    settings.organizationDetails,
    settings.organizationName,
    settings.department,
    settings.street,
    `${settings.postalCode} ${settings.city}`,
    settings.phone ? `Telefon: ${settings.phone}` : "",
    settings.email ? `E-Mail: ${settings.email}` : "",
    settings.website
      ? `Internet: ${settings.website.replace(/^https?:\/\//, "")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  const contactX = offer ? 397 : 370,
    contactWidth = offer ? 138 : 177,
    top = 158;
  let size = offer ? 6 : 8;
  while (
    size > 5 &&
    top + wrap(doc.fontSize(size), contact, contactWidth).length * size * 1.3 >
      layout.bottom - 15
  )
    size -= 0.5;
  const contactEnd = text(
    doc,
    contact,
    contactX,
    top,
    contactWidth,
    size,
    size * 1.3,
  );
  if (offer)
    doc
      .rect(390, 151, 157, Math.max(115, contactEnd - 144))
      .lineWidth(0.5)
      .strokeColor("#111111")
      .stroke();
  return Math.max(offer ? 272 : 278, recipientEnd + 15, contactEnd + 15);
}
