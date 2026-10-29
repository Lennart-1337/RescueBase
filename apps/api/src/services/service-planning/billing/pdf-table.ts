import { bottom, left, width } from "./pdf-layout.js";
import { euro, type BillingPdfModel } from "./pdf-types.js";
const widths = [28, 226, 75, 85, 85];
const offsets = widths.map(
  (_, i) => left + widths.slice(0, i).reduce((sum, value) => sum + value, 0),
);

function wrap(doc: PDFKit.PDFDocument, value: string, available: number) {
  return value.split("\n").flatMap((paragraph) => {
    const result: string[] = [];
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (line && doc.widthOfString(`${line} ${word}`) > available) {
        result.push(line);
        line = "";
      }
      for (const char of line ? ` ${word}` : word) {
        if (doc.widthOfString(line + char) > available) {
          result.push(line);
          line = "";
        }
        line += char;
      }
    }
    return [...result, line];
  });
}
export function tableHeader(doc: PDFKit.PDFDocument) {
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111111");
  [
    "Pos.",
    "Bezeichnung / Leistungszeitraum",
    "Menge",
    "Einzelpreis",
    "Summe",
  ].forEach((text, i) => {
    doc.text(text, offsets[i]!, y, {
      width: widths[i]! - 6,
      align: i > 1 ? "right" : "left",
      lineBreak: false,
    });
  });
  doc
    .moveTo(left, y + 17)
    .lineTo(left + width, y + 17)
    .strokeColor("#999999")
    .lineWidth(0.5)
    .stroke();
  doc.y = y + 27;
}
export function tableRows(
  doc: PDFKit.PDFDocument,
  model: BillingPdfModel,
  newPage: () => void,
) {
  tableHeader(doc);
  model.lines.forEach((line, index) => {
    doc.font("Helvetica").fontSize(9);
    const cells = [
      String(index + 1),
      line.description,
      line.quantity,
      euro(line.unitPrice),
      euro(line.amount),
    ].map((value, i) => wrap(doc, value, widths[i]! - 8));
    const lines = Math.max(...cells.map((cell) => cell.length));
    let cursor = 0;
    while (cursor < lines) {
      let available = Math.floor((bottom - doc.y - 12) / 12);
      if (available < Math.min(lines - cursor, 2)) {
        newPage();
        tableHeader(doc);
        available = Math.floor((bottom - doc.y - 12) / 12);
      }
      if (available < 1)
        throw new Error("Der Briefkopf lässt keinen Platz für die Positionen.");
      const take = Math.min(available, lines - cursor),
        y = doc.y;
      doc.font("Helvetica").fontSize(9).fillColor("#111111");
      cells.forEach((cell, i) => {
        const value = cell.slice(cursor, cursor + take).join("\n");
        if (value)
          doc.text(value, offsets[i]!, y, {
            width: widths[i]! - 8,
            lineGap: 1.6,
            align: i > 1 ? "right" : "left",
          });
      });
      doc.y = y + take * 12 + 12;
      cursor += take;
      if (cursor < lines) {
        newPage();
        tableHeader(doc);
      }
    }
  });
}
