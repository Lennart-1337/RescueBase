import type { BillingPdfModel } from "./pdf-types.js";
import type { BillingGeometry } from "./pdf-footer.js";
import { fixedLines, wrap } from "./pdf-text.js";
export function columns(model: BillingPdfModel, layout: BillingGeometry) {
  return model.kind === "OFFER"
    ? [50, 47, 113, 53, 45, 77, 87]
    : [28, 226, 75, 85, 85].map((v) => (v * layout.width) / 499);
}
export function tableHeader(
  doc: PDFKit.PDFDocument,
  model: BillingPdfModel,
  layout: BillingGeometry,
) {
  const offer = model.kind === "OFFER",
    widths = columns(model, layout),
    y = doc.y;
  const labels = offer
    ? [
        "Position",
        "Datum",
        "Bezeichnung/Einsatz\nmittel",
        "Dauer",
        "Anzahl",
        "Einzelpreis",
        "Summe",
      ]
    : [
        "Pos.",
        "Bezeichnung / Leistungszeitraum",
        "Menge",
        "Einzelpreis",
        "Summe",
      ];
  doc
    .font(offer ? "BillingRegular" : "BillingBold")
    .fontSize(offer ? 10 : 9)
    .fillColor("#111111");
  let x = layout.left + (offer ? 5 : 0);
  const headerLines = labels.map((label, i) =>
    wrap(doc, label, widths[i]! - 6),
  );
  labels.forEach((_, i) => {
    fixedLines(
      doc,
      headerLines[i]!,
      x,
      y,
      widths[i]! - 6,
      12,
      i >= (offer ? 5 : 2) ? "right" : "left",
    );
    x += widths[i]!;
  });
  const height = Math.max(...headerLines.map((lines) => lines.length)) * 12;
  if (!offer)
    doc
      .moveTo(layout.left, y + height + 5)
      .lineTo(layout.left + layout.width, y + height + 5)
      .strokeColor("#999999")
      .lineWidth(0.5)
      .stroke();
  doc.y = y + height + (offer ? 12 : 15);
}
