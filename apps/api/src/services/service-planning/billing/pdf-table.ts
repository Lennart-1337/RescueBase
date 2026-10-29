import { euro, type BillingPdfModel } from "./pdf-types.js";
import type { BillingGeometry } from "./pdf-footer.js";
import { fixedLines, wrap } from "./pdf-text.js";
import { columns, tableHeader } from "./pdf-table-header.js";
export function tableRows(
  doc: PDFKit.PDFDocument,
  model: BillingPdfModel,
  newPage: () => void,
  layout: BillingGeometry,
) {
  const offer = model.kind === "OFFER",
    widths = columns(model, layout),
    size = offer ? 10 : 9;
  if (doc.y + 65 > layout.bottom) newPage();
  tableHeader(doc, model, layout);
  model.lines.forEach((line, index) => {
    doc.font("BillingRegular").fontSize(size);
    const price = (value: string) =>
      offer ? euro(value).replace(" €", "€") : euro(value);
    const values = offer
      ? [
          String(index + 1),
          (line.date ?? "").replace(/\.(\d{4})$/, ".\n$1"),
          line.description,
          (line.duration ?? line.quantity).replace(
            /(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/,
            "$1-\n$2",
          ),
          line.count ?? "1",
          price(line.unitPrice),
          price(line.amount),
        ]
      : [
          String(index + 1),
          line.description,
          line.quantity,
          price(line.unitPrice),
          price(line.amount),
        ];
    const cells = values.map((value, i) => wrap(doc, value, widths[i]! - 6));
    const lines = Math.max(...cells.map((cell) => cell.length));
    let cursor = 0;
    while (cursor < lines) {
      let available = Math.floor((layout.bottom - doc.y - 12) / 12);
      if (available < Math.min(lines - cursor, 2)) {
        newPage();
        tableHeader(doc, model, layout);
        available = Math.floor((layout.bottom - doc.y - 12) / 12);
      }
      if (available < 1)
        throw new Error("Der Briefkopf lässt keinen Platz für die Positionen.");
      const take = Math.min(available, lines - cursor),
        y = doc.y;
      doc.font("BillingRegular").fontSize(size).fillColor("#111111");
      let x = layout.left + (offer ? 5 : 0);
      cells.forEach((cell, i) => {
        fixedLines(
          doc,
          cell.slice(cursor, cursor + take),
          x,
          y,
          widths[i]! - 6,
          12,
          i >= (offer ? 5 : 2) ? "right" : "left",
        );
        x += widths[i]!;
      });
      doc.y = y + take * 12 + 12;
      cursor += take;
      if (cursor < lines) {
        newPage();
        tableHeader(doc, model, layout);
      }
    }
  });
}
