import {
  billingLabel,
  billingSettings,
  displayDate,
  euro,
  type BillingPdfModel,
} from "./pdf-types.js";
import { fixedLines, wrap } from "./pdf-text.js";
import type { BillingGeometry } from "./pdf-footer.js";
export function closingText(model: BillingPdfModel) {
  const settings = billingSettings(model),
    offer = model.kind === "OFFER";
  const terms = offer
    ? [
        `Zahlbar ohne Abzüge innerhalb von ${settings.paymentTermDays} Tagen nach Erhalt der Rechnung per Überweisung.`,
        `Dieses Angebot gilt bis zum ${displayDate(model.validUntil!)}.`,
        settings.offerTerms,
      ]
    : [
        `Wir bitten den vollständigen Betrag innerhalb von ${settings.paymentTermDays} Tagen ab Rechnungsdatum ohne Abzüge auf das untenstehende Konto zu überweisen.`,
      ];
  return [
    ...terms,
    settings.taxNote,
    ...(offer
      ? [
          "Sagt Ihnen unser Angebot zu? Wenn Sie Fragen haben, beraten wir Sie gerne.",
        ]
      : []),
    `Mit freundlichen Grüßen\n${settings.signatoryName}${settings.signatoryRole ? (offer ? ` (${settings.signatoryRole})` : `\n${settings.signatoryRole}`) : ""}`,
    `Erläuterung: ${offer ? "Dieses Angebot" : "Diese Rechnung"} ist elektronisch erstellt und ohne Unterschrift gültig.`,
  ].filter(Boolean);
}
export function closing(
  doc: PDFKit.PDFDocument,
  model: BillingPdfModel,
  layout: BillingGeometry,
  newPage: () => void,
) {
  const size = 9,
    leading = 12,
    gap = model.kind === "OFFER" ? 6 : 10;
  doc.font("BillingRegular").fontSize(size);
  const paragraphs = closingText(model).map((text) =>
    wrap(doc, text, layout.width),
  );
  const height =
    32 +
    paragraphs.reduce((sum, lines) => sum + lines.length * leading + gap, 0);
  const freshCapacity = layout.bottom - 150;
  if (height <= freshCapacity && doc.y + height > layout.bottom) newPage();
  if (doc.y + 45 > layout.bottom) newPage();
  const sumY = doc.y + 5;
  doc
    .font("BillingBold")
    .fontSize(10)
    .text(
      `${billingLabel(model.kind)}ssumme:`,
      layout.left + layout.width * 0.58,
      sumY,
      { width: layout.width * 0.22, lineBreak: false },
    );
  doc.text(
    euro(model.total).replace(" €", model.kind === "OFFER" ? "€" : " €"),
    layout.left,
    sumY,
    { width: layout.width, align: "right", lineBreak: false },
  );
  doc.y = sumY + 28;
  for (const lines of paragraphs) {
    let cursor = 0;
    if (
      lines.length * leading <= freshCapacity &&
      doc.y + lines.length * leading > layout.bottom
    )
      newPage();
    while (cursor < lines.length) {
      let available = Math.floor((layout.bottom - doc.y) / leading);
      if (available < 1) {
        newPage();
        available = Math.floor((layout.bottom - doc.y) / leading);
      }
      doc.font("BillingRegular").fontSize(size).fillColor("#111111");
      const take = Math.min(available, lines.length - cursor);
      fixedLines(
        doc,
        lines.slice(cursor, cursor + take),
        layout.left,
        doc.y,
        layout.width,
        leading,
      );
      cursor += take;
      if (cursor < lines.length) newPage();
    }
    doc.y += gap;
  }
}
