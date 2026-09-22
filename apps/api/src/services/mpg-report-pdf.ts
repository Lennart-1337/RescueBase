import PDFDocument from "pdfkit";
import { drawContinuationHeader, drawDocumentHeader, drawInfoGrid, reportPalette } from "./report-theme.js";

export function createMpgPdf(title: string, subtitle: string, draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 48, size: "A4", bufferPages: true, info: { Title: title } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("pageAdded", () => drawContinuationHeader(doc, title, subtitle));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    drawDocumentHeader(doc, "RescueBase · MPG", title, subtitle);
    draw(doc);
    addPageNumbers(doc);
    doc.end();
  });
}

export function reportSection(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 44);
  doc.x = 48;
  doc.fillColor(reportPalette.ink).font("Helvetica-Bold").fontSize(13).text(title);
  doc.moveTo(48, doc.y + 5).lineTo(doc.page.width - 48, doc.y + 5).strokeColor(reportPalette.lineStrong).stroke();
  doc.moveDown(.7);
}

export function reportFields(doc: PDFKit.PDFDocument, fields: Array<[string, string]>, columns = 2) {
  ensureSpace(doc, Math.ceil(fields.length / columns) * 58);
  drawInfoGrid(doc, fields.map(([label, value]) => [label, value || "—"]), { x: 48, width: doc.page.width - 96, columns });
}

export function reportEntry(doc: PDFKit.PDFDocument, title: string, lines: string[]) {
  const clean = lines.filter(Boolean);
  const height = 30 + clean.reduce((sum, line) => sum + doc.heightOfString(line, { width: doc.page.width - 96, lineGap: 2 }), 0);
  ensureSpace(doc, Math.min(height, 220));
  doc.x = 48;
  doc.fillColor(reportPalette.ink).font("Helvetica-Bold").fontSize(10).text(title, { width: doc.page.width - 96 });
  doc.fillColor(reportPalette.muted).font("Helvetica").fontSize(9).text(clean.join("\n"), { width: doc.page.width - 96, lineGap: 2 });
  doc.moveTo(48, doc.y + 7).lineTo(doc.page.width - 48, doc.y + 7).strokeColor(reportPalette.line).stroke();
  doc.moveDown(1.15);
}

export function reportNote(doc: PDFKit.PDFDocument, value: string) {
  ensureSpace(doc, 46);
  const y = doc.y;
  doc.x = 48;
  doc.rect(48, y, doc.page.width - 96, 36).fill(reportPalette.panel);
  doc.fillColor(reportPalette.muted).font("Helvetica").fontSize(9).text(value, 60, y + 12, { width: doc.page.width - 120 });
  doc.y = y + 48;
}

export function drawReportSignature(doc: PDFKit.PDFDocument, value?: string | null) {
  const data = value?.split(",")[1];
  if (!data) return;
  ensureSpace(doc, 74);
  doc.image(Buffer.from(data, "base64"), 48, doc.y, { fit: [180, 55] });
  doc.x = 48;
  doc.y += 66;
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) { if (doc.y + height > doc.page.height - 56) doc.addPage(); }
function addPageNumbers(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    doc.fillColor(reportPalette.muted).font("Helvetica").fontSize(8).text(`Seite ${index + 1} von ${range.count}`, 48, doc.page.height - 72, { width: doc.page.width - 96, align: "right", lineBreak: false });
  }
}
