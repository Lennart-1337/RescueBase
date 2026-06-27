import { createInfoGridLayout } from "./report-layout.js";

export const reportPalette = {
  ink: "#17202c",
  muted: "#657386",
  line: "#edf0f4",
  lineStrong: "#d8dee7",
  panel: "#f8fafc",
  panelSoft: "#fafbfd",
  panelMuted: "#f2f4f7",
  paper: "#ffffff",
  critical: "#b42318"
} as const;

export function drawDocumentHeader(doc: PDFKit.PDFDocument, eyebrow: string, title: string, subtitle: string) {
  doc.fillColor(reportPalette.muted).font("Helvetica-Bold").fontSize(8).text(eyebrow.toUpperCase(), 48, 48);
  doc.fillColor(reportPalette.ink).font("Helvetica-Bold").fontSize(24).text(title, 48, 62, { width: doc.page.width - 96 });
  doc.fillColor(reportPalette.muted).font("Helvetica").fontSize(10).text(subtitle, 48, 92, { width: doc.page.width - 96 });
  doc.moveTo(48, 116).lineTo(doc.page.width - 48, 116).strokeColor(reportPalette.lineStrong).stroke();
  doc.y = 132;
}

export function drawContinuationHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  doc.fillColor(reportPalette.ink).font("Helvetica-Bold").fontSize(16).text(title, 48, 48);
  doc.fillColor(reportPalette.muted).font("Helvetica").fontSize(9).text(subtitle, 48, 68);
  doc.moveTo(48, 88).lineTo(doc.page.width - 48, 88).strokeColor(reportPalette.line).stroke();
  doc.y = 102;
}

export function drawInfoGrid(
  doc: PDFKit.PDFDocument,
  items: Array<[string, string]>,
  options: { x: number; y?: number; width: number; columns?: number }
) {
  const y = options.y ?? doc.y;
  const cards = createInfoGridLayout({
    x: options.x,
    y,
    width: options.width,
    count: items.length,
    columns: options.columns ?? 2,
    gap: 12
  });

  items.forEach(([label, value], index) => {
    const card = cards[index];
    if (!card) return;
    doc.fillColor(reportPalette.muted).font("Helvetica-Bold").fontSize(7).text(label.toUpperCase(), card.x, card.y, {
      width: card.width
    });
    doc.fillColor(reportPalette.ink).font("Helvetica").fontSize(11).text(value, card.x, card.y + 13, {
      width: card.width,
      height: card.height - 16
    });
    doc.moveTo(card.x, card.y + card.height).lineTo(card.x + card.width, card.y + card.height).strokeColor(reportPalette.line).stroke();
  });

  const lastCard = cards.at(-1);
  doc.y = lastCard ? lastCard.y + lastCard.height + 12 : y;
}

export function drawStatStrip(doc: PDFKit.PDFDocument, items: string[]) {
  const y = doc.y + 6;
  doc.fillColor(reportPalette.muted).font("Helvetica-Bold").fontSize(8).text(items.join("  ·  "), 48, y, {
    width: doc.page.width - 96
  });
  doc.moveTo(48, y + 16).lineTo(doc.page.width - 48, y + 16).strokeColor(reportPalette.line).stroke();
  doc.y = y + 24;
}

export function drawTableHeader(
  doc: PDFKit.PDFDocument,
  y: number,
  columns: Array<{ label: string; x: number; width: number; align?: "left" | "right" | "center" }>
) {
  doc.fillColor(reportPalette.muted).font("Helvetica-Bold").fontSize(8);
  columns.forEach((column) => doc.text(column.label, column.x, y + 1, { width: column.width, align: column.align ?? "left" }));
  doc.moveTo(48, y + 14).lineTo(doc.page.width - 48, y + 14).strokeColor(reportPalette.lineStrong).stroke();
  return y + 24;
}

export function drawTotalBar(doc: PDFKit.PDFDocument, y: number, label: string, value: string) {
  doc.moveTo(330, y).lineTo(doc.page.width - 48, y).strokeColor(reportPalette.lineStrong).stroke();
  doc.fillColor(reportPalette.ink).font("Helvetica-Bold").fontSize(11).text(label, 340, y + 12, { width: 72 });
  doc.text(value, 418, y + 12, { width: 96, align: "right" });
}

export function fitSingleLine(doc: PDFKit.PDFDocument, text: string, width: number) {
  if (doc.widthOfString(text) <= width) {
    return text;
  }
  let result = text;
  while (result.length > 1 && doc.widthOfString(`${result}...`) > width) {
    result = result.slice(0, -1);
  }
  return `${result}...`;
}
