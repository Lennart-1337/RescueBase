import { openSansRegular, openSansBold } from "./assets/fonts.js";
import PDFDocument from "pdfkit";
import { closing } from "./pdf-closing.js";
import { footer, geometry } from "./pdf-footer.js";
import { left, letterhead } from "./pdf-layout.js";
import { tableRows } from "./pdf-table.js";
import {
  billingLabel,
  billingSettings,
  type BillingPdfModel,
} from "./pdf-types.js";
export type { BillingPdfModel } from "./pdf-types.js";
export function renderBillingPdf(model: BillingPdfModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, left, right: left, bottom: 0 },
      bufferPages: true,
      info: {
        Title: `${billingLabel(model.kind)} ${model.number}`,
        Author: billingSettings(model).organizationName,
      },
    });
    doc.registerFont("BillingRegular", openSansRegular);
    doc.registerFont("BillingBold", openSansBold);
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    try {
      const layout = geometry(doc, model);
      const newPage = () => {
        doc.addPage();
        letterhead(doc, model, false, layout);
      };
      letterhead(doc, model, true, layout);
      tableRows(doc, model, newPage, layout);
      closing(doc, model, layout, newPage);
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        footer(doc, layout, i + 1, range.count);
      }
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}
