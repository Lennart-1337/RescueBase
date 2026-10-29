import { closingText } from "./pdf-closing.js";
import { footer } from "./pdf-footer.js";
import PDFDocument from "pdfkit";
import { bottom, left, letterhead, width } from "./pdf-layout.js";
import { tableRows } from "./pdf-table.js";
import { billingLabel, euro, type BillingPdfModel } from "./pdf-types.js";
export type { BillingPdfModel } from "./pdf-types.js";

export function renderBillingPdf(model: BillingPdfModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, left, right: left, bottom: 105 },
      bufferPages: true,
      info: {
        Title: `${billingLabel(model.kind)} ${model.number}`,
        Author: "DLRG Ortsgruppe Neukirchen-Vluyn e.V.",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    try {
      const newPage = () => {
        doc.addPage();
        letterhead(doc, model, false);
      };
      letterhead(doc, model, true);
      tableRows(doc, model, newPage);
      doc.font("Helvetica").fontSize(9);
      const paragraphs = closingText(model);
      const closingHeight =
        42 +
        paragraphs.reduce(
          (height, text) =>
            height + doc.heightOfString(text, { width, lineGap: 2 }) + 10,
          0,
        );
      if (doc.y + closingHeight > bottom) newPage();
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(
          `${billingLabel(model.kind)}ssumme: ${euro(model.total)}`,
          left,
          doc.y + 6,
          { width, align: "right" },
        );
      doc.y += 17;
      doc.font("Helvetica").fontSize(9);
      for (const paragraph of paragraphs) {
        doc.text(paragraph, left, doc.y, { width, lineGap: 2 });
        doc.y += 10;
      }
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        footer(doc, i + 1, range.count);
      }
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}
