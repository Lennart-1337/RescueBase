import { Injectable, NotFoundException } from "@nestjs/common";
import { InventoryProcurementStatus, PurchaseOrderStatus } from "@prisma/client";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { PrismaService } from "../persistence/prisma.service.js";
import type { BatchRecord, OrderRecord } from "../persistence/mappers.js";
import { createQrLabelLayout, createQrSheetLayout, needsPageBreak } from "./report-layout.js";
import {
  drawContinuationHeader,
  drawDocumentHeader,
  drawInfoGrid,
  drawStatStrip,
  drawTableHeader,
  drawTotalBar,
  fitSingleLine,
  reportPalette as palette
} from "./report-theme.js";

type QrPdfFormat = "a4" | "label";
type ProcurementPdfFilters = { articleId?: string; locationId?: string; q?: string };
type ProcurementOrderReportRecord = {
  id: string;
  articleId: string;
  locationId: string;
  status: InventoryProcurementStatus;
  requestedQuantity: number;
  receivedQuantity: number;
  articleUrlSnapshot: string | null;
  updatedAt: Date;
  article: { name: string; unit: string; manufacturer: string | null; manufacturerPartNumber: string | null; articleUrl: string | null };
  location: { name: string };
  receipts: Array<{ lotNumber: string }>;
};
type PurchaseOrderPdfRecord = {
  id: string;
  orderNumber: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  notes: string | null;
  approvedAt: Date | null;
  approvedByName: string | null;
  createdAt: Date;
  location: { name: string };
  lines: Array<{
    articleNameSnapshot: string;
    supplierArticleNumberSnapshot: string | null;
    articleUrlSnapshot: string | null;
    grossUnitPriceCents: number;
    orderedQuantity: number;
    receivedQuantity: number;
    unitSnapshot: string;
    note: string | null;
  }>;
};

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async inventoryCsv(): Promise<string> {
    const header = "Artikel,Lagerort,Charge,Ablaufdatum,Menge\n";
    const batches: BatchRecord[] = await this.prisma.batch.findMany({
      where: { deletedAt: null },
      include: { article: true, location: true },
      orderBy: [{ article: { name: "asc" } }, { expiresAt: "asc" }]
    });
    const rows = batches.map((batch: BatchRecord) =>
      [batch.article.name, batch.location.name, batch.lotNumber, batch.expiresAt.toISOString().slice(0, 10), batch.quantity]
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(",")
    );
    return `${header}${rows.join("\n")}\n`;
  }

  async replenishmentCsv(): Promise<string> {
    const header = "Auftrag,Rucksack,Status,Artikel,Soll,Erfüllt,Einheit,Grund\n";
    const orders: Array<OrderRecord & { kit: { name: string } }> = await this.prisma.replenishmentOrder.findMany({
      include: { kit: true, items: true },
      orderBy: { createdAt: "desc" }
    });
    const rows = orders.flatMap((order: OrderRecord & { kit: { name: string } }) =>
      order.items.map((item: OrderRecord["items"][number]) =>
        [order.id, order.kit.name, order.status, item.articleName, item.requestedQuantity, item.fulfilledQuantity, item.unit, item.reason]
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
    );
    return `${header}${rows.join("\n")}\n`;
  }

  async procurementPdf(filters: ProcurementPdfFilters): Promise<Buffer> {
    const orders: ProcurementOrderReportRecord[] = await this.prisma.inventoryProcurementOrder.findMany({
      where: { status: { in: [InventoryProcurementStatus.OPEN, InventoryProcurementStatus.IN_PROGRESS] } },
      include: {
        article: { select: { name: true, unit: true, manufacturer: true, manufacturerPartNumber: true, articleUrl: true } },
        location: { select: { name: true } },
        receipts: { select: { lotNumber: true } }
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    });
    const filtered = orders.filter((order) => matchesProcurementFilters(filters, order));
    const totalRemaining = filtered.reduce((sum, order) => sum + Math.max(order.requestedQuantity - order.receivedQuantity, 0), 0);
    const filterLabel = summarizeProcurementFilters(filters);

    return this.renderPdf((doc) => {
      this.drawProcurementHeader(doc, filterLabel, totalRemaining, filtered.length);

      if (filtered.length === 0) {
        doc.moveDown(1);
        doc.fillColor(palette.muted).font("Helvetica").fontSize(11).text(
          "Für die gesetzten Filter gibt es derzeit keine offenen Beschaffungsaufträge.",
          48,
          doc.y,
          { width: doc.page.width - 96 }
        );
        return;
      }

      let y = this.drawProcurementTableHeader(doc, doc.y + 14);
      filtered.forEach((order, index) => {
        const rowHeight = this.measureProcurementOrderRow(doc, order);
        if (needsPageBreak({
          currentY: y,
          requiredHeight: rowHeight,
          pageHeight: doc.page.height,
          bottomMargin: doc.page.margins.bottom,
          reserve: 18
        })) {
          doc.addPage();
          this.drawContinuationHeader(doc, "Einkaufsliste", "Beschaffungsliste · Fortsetzung");
          y = this.drawProcurementTableHeader(doc, doc.y + 12);
        }
        y = this.drawProcurementOrderRow(doc, y, order, index);
      });
    });
  }

  async qrLabelPdf(kitId: string, format: QrPdfFormat): Promise<Buffer> {
    const kit = await this.prisma.kit.findFirst({
      where: { id: kitId, deletedAt: null },
      include: { location: true, template: true }
    });
    if (!kit) {
      throw new NotFoundException("Rucksack nicht gefunden.");
    }

    const publicUrl = `${process.env.APP_PUBLIC_URL ?? "http://localhost:5173"}/check/${kit.publicToken}`;
    const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 0, width: format === "label" ? 180 : 260 });
    const qrImage = Buffer.from(qrDataUrl.split(",")[1] ?? "", "base64");

    if (format === "label") {
      return this.renderPdf((doc) => this.drawQrLabel(doc, kit, qrImage), {
        margin: 0,
        size: [mmToPt(62), mmToPt(60)]
      });
    }

    return this.renderPdf((doc) => this.drawQrSheet(doc, kit, publicUrl, qrImage));
  }

  async replenishmentPdf(orderId: string): Promise<Buffer> {
    const order = await this.prisma.replenishmentOrder.findUnique({
      where: { id: orderId },
      include: { items: true, kit: { include: { location: true } } }
    });
    if (!order) {
      throw new NotFoundException("Nachfüllauftrag nicht gefunden.");
    }

    return this.renderPdf((doc) => {
      this.drawDocumentHeader(doc, "Nachfüllauftrag", order.kit.name, `Auftrag ${order.id}`);
      this.drawMetaGrid(doc, [
        ["Status", formatOrderStatus(order.status)],
        ["Rucksackcode", order.kit.code],
        ["Standort", order.kit.location.name],
        ["Erstellt", formatDateTime(order.createdAt)]
      ], { x: 48, width: doc.page.width - 96 });

      const totalRequested = order.items.reduce((sum: number, item: OrderRecord["items"][number]) => sum + item.requestedQuantity, 0);
      const totalFulfilled = order.items.reduce((sum: number, item: OrderRecord["items"][number]) => sum + item.fulfilledQuantity, 0);
      this.drawSummaryLine(doc, [
        `${order.items.length} Positionen`,
        `${totalRequested} Soll`,
        `${totalFulfilled} erfüllt`,
        `${Math.max(totalRequested - totalFulfilled, 0)} offen`
      ]);

      let y = doc.y + 20;
      y = this.drawTableHeader(doc, y, ["Artikel", "Grund", "Soll", "Erfüllt", "Offen"]);
      order.items.forEach((item: OrderRecord["items"][number], index: number) => {
        const rowHeight = this.measureReplenishmentRow(doc, item);
        if (needsPageBreak({
          currentY: y,
          requiredHeight: rowHeight,
          pageHeight: doc.page.height,
          bottomMargin: doc.page.margins.bottom,
          reserve: 116
        })) {
          doc.addPage();
          this.drawContinuationHeader(doc, "Nachfüllauftrag", `Auftrag ${order.id} · Fortsetzung`);
          y = this.drawTableHeader(doc, doc.y + 14, ["Artikel", "Grund", "Soll", "Erfüllt", "Offen"]);
        }
        y = this.drawReplenishmentRow(doc, y, item, index);
      });

      const footerHeight = 128;
      if (needsPageBreak({
        currentY: y + 20,
        requiredHeight: footerHeight,
        pageHeight: doc.page.height,
        bottomMargin: doc.page.margins.bottom,
        reserve: 0
      })) {
        doc.addPage();
        this.drawContinuationHeader(doc, "Nachfüllauftrag", `Auftrag ${order.id} · Hinweise`);
        y = doc.y + 20;
      } else {
        y += 20;
      }
      this.drawOperationalNotes(doc, y);
    });
  }

  async purchaseOrderPdf(orderId: string, options: { includeLineNotes?: boolean }): Promise<Buffer> {
    const order: PurchaseOrderPdfRecord | null = await this.prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        location: { select: { name: true } },
        lines: { orderBy: { createdAt: "asc" } }
      }
    });
    if (!order) {
      throw new NotFoundException("Bestellung nicht gefunden.");
    }

    return this.renderPdf((doc) => {
      this.drawDocumentHeader(doc, "Bestellung", order.orderNumber, order.supplierName);
      this.drawMetaGrid(doc, [
        ["Status", formatPurchaseOrderStatus(order.status)],
        ["Zielort", order.location.name],
        ["Erstellt", formatDateTime(order.createdAt)],
        ["Freigabe", order.approvedAt ? `${order.approvedByName ?? "Unbekannt"} · ${formatDateTime(order.approvedAt)}` : "Noch nicht freigegeben"]
      ], { x: 48, width: doc.page.width - 96 });

      const totalGrossCents = order.lines.reduce((sum, line) => sum + line.grossUnitPriceCents * line.orderedQuantity, 0);
      const totalOrdered = order.lines.reduce((sum, line) => sum + line.orderedQuantity, 0);
      const totalReceived = order.lines.reduce((sum, line) => sum + line.receivedQuantity, 0);
      this.drawSummaryLine(doc, [
        `${order.lines.length} Positionen`,
        `${totalOrdered} bestellt`,
        `${Math.max(totalOrdered - totalReceived, 0)} offen`,
        formatCents(totalGrossCents)
      ]);

      if (order.notes) {
        const noteTop = doc.y + 6;
        const noteHeight = doc.font("Helvetica").fontSize(9).heightOfString(order.notes, { width: doc.page.width - 96 });
        doc.fillColor(palette.muted).font("Helvetica-Bold").fontSize(8).text("HINWEISE", 48, noteTop);
        doc.fillColor(palette.ink).font("Helvetica").fontSize(9).text(order.notes, 48, noteTop + 14, { width: doc.page.width - 96 });
        doc.moveTo(48, noteTop + noteHeight + 24).lineTo(doc.page.width - 48, noteTop + noteHeight + 24).strokeColor(palette.line).stroke();
        doc.y = noteTop + noteHeight + 32;
      }

      let y = this.drawPurchaseOrderTableHeader(doc, doc.y + 20);
      order.lines.forEach((line, index) => {
        const rowHeight = this.measurePurchaseOrderLine(doc, line, Boolean(options.includeLineNotes));
        if (needsPageBreak({
          currentY: y,
          requiredHeight: rowHeight,
          pageHeight: doc.page.height,
          bottomMargin: doc.page.margins.bottom,
          reserve: 64
        })) {
          doc.addPage();
          this.drawContinuationHeader(doc, "Bestellung", `${order.orderNumber} · Fortsetzung`);
          y = this.drawPurchaseOrderTableHeader(doc, doc.y + 12);
        }
        y = this.drawPurchaseOrderLine(doc, y, line, index, Boolean(options.includeLineNotes));
      });

      if (needsPageBreak({
        currentY: y,
        requiredHeight: 42,
        pageHeight: doc.page.height,
        bottomMargin: doc.page.margins.bottom,
        reserve: 0
      })) {
        doc.addPage();
        this.drawContinuationHeader(doc, "Bestellung", `${order.orderNumber} · Summe`);
        y = doc.y + 10;
      }
      drawTotalBar(doc, y + 4, "Gesamt", formatCents(totalGrossCents));
    });
  }

  private drawQrSheet(doc: PDFKit.PDFDocument, kit: { name: string; code: string; publicToken: string; location: { name: string }; template: { name: string; version: number } }, publicUrl: string, qrImage: Buffer) {
    this.drawDocumentHeader(doc, "QR-/NFC-Etikett", kit.name, kit.code);
    const layout = createQrSheetLayout(doc.page.width, doc.page.height);
    doc.fillColor(palette.muted).font("Helvetica").fontSize(10).text(
      "Dieses Blatt ist für den physischen Rucksack bestimmt. Der QR-Code führt direkt in den öffentlichen Check-Workflow.",
      layout.leftColumn.x,
      layout.leftColumn.y,
      { width: layout.leftColumn.width }
    );
    this.drawQrCard(doc, layout.qrBox, qrImage);
    this.drawMetaGrid(doc, [
      ["Rucksack", kit.name],
      ["Code", kit.code],
      ["Standort", kit.location.name],
      ["Vorlage", `${kit.template.name} v${kit.template.version}`]
    ], { x: layout.leftColumn.x, y: layout.leftColumn.y + 56, width: layout.leftColumn.width });
    const linkTop = Math.max(layout.linkTop, doc.y + 16);
    const urlHeight = doc.font("Helvetica").fontSize(9).heightOfString(publicUrl, { width: doc.page.width - 96 });
    doc.fillColor(palette.muted).font("Helvetica-Bold").fontSize(8).text("DIREKTLINK", 48, linkTop);
    doc.fillColor(palette.ink).font("Helvetica").fontSize(9).text(publicUrl, 48, linkTop + 14, {
      width: doc.page.width - 96
    });
    doc.fillColor(palette.muted).fontSize(9).text(
      "Hinweis: Bei Tokenrotation muss dieses Etikett ersetzt werden. Das alte Etikett verliert danach sofort seine Gültigkeit.",
      48,
      linkTop + 26 + urlHeight,
      { width: doc.page.width - 96 }
    );
    doc.moveTo(48, linkTop + 58 + urlHeight).lineTo(doc.page.width - 48, linkTop + 58 + urlHeight).strokeColor(palette.line).stroke();
  }

  private drawQrLabel(doc: PDFKit.PDFDocument, kit: { name: string; code: string; location: { name: string } }, qrImage: Buffer) {
    const layout = createQrLabelLayout(doc.page.width, doc.page.height);
    const code = fitSingleLine(doc.font("Helvetica-Bold").fontSize(8.8), kit.code, layout.codeBox.width);
    const name = fitSingleLine(doc.font("Helvetica-Bold").fontSize(5.6), kit.name, layout.textBox.width);
    const location = fitSingleLine(doc.font("Helvetica").fontSize(5.8), kit.location.name, layout.metaBox.width);

    doc.fillColor(palette.paper).rect(0, 0, doc.page.width, doc.page.height).fill();
    doc.roundedRect(layout.outer.x, layout.outer.y, layout.outer.width, layout.outer.height, 4).fillAndStroke(palette.paper, palette.lineStrong);

    doc.fillColor(palette.muted).font("Helvetica-Bold").fontSize(5.2).text("CHECK", layout.textBox.x, layout.textBox.y, {
      width: layout.textBox.width
    });
    doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(8.8).text(code, layout.codeBox.x, layout.codeBox.y, {
      width: layout.codeBox.width
    });
    doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(5.6).text(name, layout.textBox.x, layout.textBox.y + 24, {
      width: layout.textBox.width
    });
    doc.fillColor(palette.muted).font("Helvetica").fontSize(5.8).text(location, layout.metaBox.x, layout.metaBox.y + 1, {
      width: layout.metaBox.width
    });

    doc.roundedRect(layout.qrBox.x - 3, layout.qrBox.y - 3, layout.qrBox.width + 6, layout.qrBox.height + 6, 4).fillAndStroke(palette.paper, palette.lineStrong);
    doc.image(qrImage, layout.qrBox.x, layout.qrBox.y, { width: layout.qrBox.width, height: layout.qrBox.height });
    doc.fillColor(palette.muted).font("Helvetica-Bold").fontSize(5.2).text("Scan für Check", layout.qrCaptionBox.x, layout.qrCaptionBox.y, {
      width: layout.qrCaptionBox.width,
      align: "center"
    });
  }

  private drawDocumentHeader(doc: PDFKit.PDFDocument, eyebrow: string, title: string, subtitle: string) {
    drawDocumentHeader(doc, eyebrow, title, subtitle);
  }

  private drawMetaGrid(doc: PDFKit.PDFDocument, rows: Array<[string, string]>, options: { x: number; y?: number; width: number }) {
    drawInfoGrid(doc, rows, { ...options, columns: options.width < 340 ? 1 : 2 });
  }

  private drawSummaryLine(doc: PDFKit.PDFDocument, items: string[]) {
    drawStatStrip(doc, items);
  }

  private drawTableHeader(doc: PDFKit.PDFDocument, y: number, headers: string[]) {
    return drawTableHeader(doc, y, [
      { label: headers[0] ?? "", x: 56, width: 190 },
      { label: headers[1] ?? "", x: 255, width: 92 },
      { label: headers[2] ?? "", x: 358, width: 40, align: "right" },
      { label: headers[3] ?? "", x: 418, width: 44, align: "right" },
      { label: headers[4] ?? "", x: 482, width: 48, align: "right" }
    ]);
  }

  private drawContinuationHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
    drawContinuationHeader(doc, title, subtitle);
  }

  private drawQrCard(doc: PDFKit.PDFDocument, box: { x: number; y: number; width: number; height: number }, qrImage: Buffer) {
    doc.rect(box.x - 12, box.y - 12, box.width + 24, box.height + 42).strokeColor(palette.line).stroke();
    doc.image(qrImage, box.x, box.y, { width: box.width, height: box.height });
    doc.fillColor(palette.muted).font("Helvetica-Bold").fontSize(8).text("Öffentlicher Check", box.x, box.y + box.height + 10, {
      width: box.width,
      align: "center"
    });
  }

  private measureReplenishmentRow(
    doc: PDFKit.PDFDocument,
    item: { articleName: string; reason: string; critical: boolean; unit: string }
  ) {
    const articleHeight = doc.font("Helvetica-Bold").fontSize(10).heightOfString(item.articleName, { width: 190 });
    const reasonHeight = doc.font("Helvetica").fontSize(9).heightOfString(formatReason(item.reason), { width: 92 });
    return Math.max(34, articleHeight + 18, reasonHeight + 12);
  }

  private drawReplenishmentRow(
    doc: PDFKit.PDFDocument,
    y: number,
    item: {
      articleName: string;
      reason: string;
      critical: boolean;
      unit: string;
      requestedQuantity: number;
      fulfilledQuantity: number;
    },
    index: number
  ) {
    const rowHeight = this.measureReplenishmentRow(doc, item);
    if (index % 2 === 0) {
      doc.rect(48, y - 4, doc.page.width - 96, rowHeight + 6).fill(palette.panelSoft);
    }
    doc.fillColor(item.critical ? palette.critical : palette.ink).font("Helvetica-Bold").fontSize(10).text(item.articleName, 56, y, { width: 190 });
    doc.fillColor(palette.muted).font("Helvetica").fontSize(8).text(item.critical ? `Kritisch · ${item.unit}` : item.unit, 56, y + rowHeight - 14, {
      width: 190
    });
    doc.fillColor(palette.ink).font("Helvetica").fontSize(9).text(formatReason(item.reason), 255, y + 2, { width: 92 });
    doc.text(String(item.requestedQuantity), 358, y + 2, { width: 40, align: "right" });
    doc.text(String(item.fulfilledQuantity), 418, y + 2, { width: 44, align: "right" });
    doc.font(item.fulfilledQuantity < item.requestedQuantity ? "Helvetica-Bold" : "Helvetica")
      .text(String(item.requestedQuantity - item.fulfilledQuantity), 482, y + 2, { width: 48, align: "right" });
    doc.moveTo(48, y + rowHeight + 8).lineTo(doc.page.width - 48, y + rowHeight + 8).strokeColor(palette.line).stroke();
    return y + rowHeight + 10;
  }

  private drawOperationalNotes(doc: PDFKit.PDFDocument, y: number) {
    doc.fillColor(palette.muted).font("Helvetica-Bold").fontSize(8).text("OPERATIVE HINWEISE", 48, y);
    doc.fillColor(palette.ink).font("Helvetica").fontSize(9)
      .text("Chargen bitte im System buchen. Teilfüllungen und Restmengen müssen nachvollziehbar bleiben.", 48, y + 14, {
        width: doc.page.width - 96
      });
    doc.moveTo(48, y + 66).lineTo(doc.page.width - 48, y + 66).strokeColor(palette.line).stroke();
    doc.moveTo(48, y + 100).lineTo(240, y + 100).strokeColor(palette.line).stroke();
    doc.moveTo(320, y + 100).lineTo(doc.page.width - 48, y + 100).strokeColor(palette.line).stroke();
    doc.fillColor(palette.muted).fontSize(8).text("Bearbeitet von", 48, y + 104).text("Datum / Unterschrift", 320, y + 104);
  }

  private drawProcurementHeader(doc: PDFKit.PDFDocument, filterLabel: string, totalRemaining: number, orderCount: number) {
    this.drawDocumentHeader(doc, "Beschaffung", "Einkaufsliste", "Offene Beschaffungsaufträge für den Einkauf.");
    this.drawMetaGrid(doc, [
      ["Stand", formatDateTime(new Date())],
      ["Filter", filterLabel],
      ["Positionen", String(orderCount)],
      ["Offene Menge", String(totalRemaining)]
    ], { x: 48, width: doc.page.width - 96 });
  }

  private drawProcurementTableHeader(doc: PDFKit.PDFDocument, y: number) {
    return drawTableHeader(doc, y, [
      { label: "ARTIKEL", x: 56, width: 164 },
      { label: "STANDORT / DETAILS", x: 230, width: 220 },
      { label: "OFFEN", x: 478, width: 56, align: "right" }
    ]);
  }

  private drawPurchaseOrderTableHeader(doc: PDFKit.PDFDocument, y: number) {
    return drawTableHeader(doc, y, [
      { label: "ARTIKEL", x: 56, width: 168 },
      { label: "ART.-NR.", x: 232, width: 70 },
      { label: "MENGE", x: 310, width: 48, align: "right" },
      { label: "PREIS", x: 366, width: 64, align: "right" },
      { label: "SUMME", x: 438, width: 64, align: "right" },
      { label: "LINK", x: 510, width: 24, align: "right" }
    ]);
  }

  private measurePurchaseOrderLine(
    doc: PDFKit.PDFDocument,
    line: PurchaseOrderPdfRecord["lines"][number],
    includeLineNotes: boolean
  ) {
    const articleHeight = doc.font("Helvetica-Bold").fontSize(10).heightOfString(line.articleNameSnapshot, { width: 176 });
    const noteHeight = includeLineNotes && line.note
      ? doc.font("Helvetica").fontSize(8).heightOfString(line.note, { width: 454 }) + 10
      : 0;
    return Math.max(34, articleHeight + 16) + noteHeight;
  }

  private drawPurchaseOrderLine(
    doc: PDFKit.PDFDocument,
    y: number,
    line: PurchaseOrderPdfRecord["lines"][number],
    index: number,
    includeLineNotes: boolean
  ) {
    const rowHeight = this.measurePurchaseOrderLine(doc, line, includeLineNotes);
    if (index % 2 === 0) {
      doc.rect(48, y - 4, doc.page.width - 96, rowHeight + 6).fill(palette.panelSoft);
    }
    doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(10).text(line.articleNameSnapshot, 48, y, { width: 176 });
    doc.font("Helvetica").fontSize(8).fillColor(palette.muted).text(line.unitSnapshot, 48, y + 18, { width: 176 });
    doc.fillColor(palette.ink).font("Helvetica").fontSize(9);
    doc.text(line.supplierArticleNumberSnapshot ?? "-", 232, y + 2, { width: 70 });
    doc.text(String(line.orderedQuantity), 310, y + 2, { width: 48, align: "right" });
    doc.text(formatCents(line.grossUnitPriceCents), 366, y + 2, { width: 64, align: "right" });
    doc.font("Helvetica-Bold").text(formatCents(line.grossUnitPriceCents * line.orderedQuantity), 438, y + 2, { width: 64, align: "right" });
    if (line.articleUrlSnapshot) {
      doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(9).text("Link", 510, y + 2, {
        width: 34,
        align: "right",
        link: line.articleUrlSnapshot,
        underline: true
      });
    } else {
      doc.fillColor(palette.muted).font("Helvetica").fontSize(9).text("-", 510, y + 2, { width: 34, align: "right" });
    }
    if (includeLineNotes && line.note) {
      doc.fillColor(palette.muted).font("Helvetica").fontSize(8).text(line.note, 48, y + 34, { width: 454 });
    }
    doc.moveTo(48, y + rowHeight + 8).lineTo(doc.page.width - 48, y + rowHeight + 8).strokeColor(palette.line).stroke();
    return y + rowHeight + 10;
  }

  private measureProcurementOrderRow(doc: PDFKit.PDFDocument, order: ProcurementOrderReportRecord) {
    const articleHeight = doc.font("Helvetica-Bold").fontSize(11).heightOfString(order.article.name, { width: 170 });
    const detailHeight = doc.font("Helvetica").fontSize(8).heightOfString(procurementDetails(order).join("\n"), { width: 232 });
    const articleUrl = order.article.articleUrl ?? order.articleUrlSnapshot;
    const shopHeight = articleUrl
      ? doc.heightOfString(`Shop: ${articleUrl}`, { width: 404 })
      : 0;
    return 16 + Math.max(articleHeight, detailHeight, 26) + shopHeight;
  }

  private drawProcurementOrderRow(doc: PDFKit.PDFDocument, y: number, order: ProcurementOrderReportRecord, index: number) {
    const rowHeight = this.measureProcurementOrderRow(doc, order);
    const remainingQuantity = Math.max(order.requestedQuantity - order.receivedQuantity, 0);
    const articleUrl = order.article.articleUrl ?? order.articleUrlSnapshot;
    const detailText = procurementDetails(order).join("\n");

    if (index % 2 === 0) {
      doc.rect(48, y - 4, doc.page.width - 96, rowHeight + 6).fill(palette.panelSoft);
    }

    doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(11).text(order.article.name, 48, y, { width: 170 });
    doc.font("Helvetica").fontSize(8).fillColor(palette.ink).text(detailText, 230, y, { width: 232 });
    doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(16).text(String(remainingQuantity), 478, y + 2, { width: 56, align: "right" });
    doc.font("Helvetica").fontSize(8).fillColor(palette.muted).text(order.article.unit, 478, y + 22, { width: 56, align: "right" });
    doc.font("Helvetica-Bold").fontSize(7).fillColor(palette.muted).text(formatProcurementStatus(order.status), 478, y + 34, { width: 56, align: "right" });

    if (articleUrl) {
      const shopY = y + Math.max(
        doc.heightOfString(order.article.name, { width: 170 }),
        doc.heightOfString(detailText, { width: 232 }),
        34
      ) + 6;
      doc.fillColor(palette.muted).font("Helvetica").fontSize(8).text(`Shop: ${articleUrl}`, 48, shopY, {
        width: 486,
        link: articleUrl,
        underline: true
      });
    }

    doc.moveTo(48, y + rowHeight + 8).lineTo(doc.page.width - 48, y + rowHeight + 8).strokeColor(palette.line).stroke();
    return y + rowHeight + 10;
  }

  private renderPdf(
    draw: (doc: PDFKit.PDFDocument) => void,
    options: { margin?: number; size?: string | [number, number] } = {}
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({
        margin: options.margin ?? 48,
        size: options.size ?? "A4",
        info: { Title: "RescueBase Report" }
      });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      draw(doc);
      doc.end();
    });
  }
}

function formatReason(reason: string) {
  if (reason === "SHORTAGE") {
    return "Fehlmenge";
  }
  if (reason === "DISCARDED_EXPIRED") {
    return "Verwurf Ablauf";
  }
  return "Fehlmenge + Verwurf";
}

function formatOrderStatus(status: string) {
  if (status === "OPEN") {
    return "Offen";
  }
  if (status === "DONE") {
    return "Erledigt";
  }
  return "Storniert";
}

function formatProcurementStatus(status: InventoryProcurementStatus) {
  if (status === InventoryProcurementStatus.OPEN) return "Offen";
  return "In Bearbeitung";
}

function formatPurchaseOrderStatus(status: PurchaseOrderStatus) {
  if (status === PurchaseOrderStatus.DRAFT) return "Entwurf";
  if (status === PurchaseOrderStatus.APPROVED) return "Freigegeben";
  if (status === PurchaseOrderStatus.ORDERED) return "Bestellt";
  if (status === PurchaseOrderStatus.PARTIALLY_RECEIVED) return "Teilweise erhalten";
  return "Erhalten";
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(cents / 100);
}

function procurementDetails(order: ProcurementOrderReportRecord) {
  const details = [
    `Standort: ${order.location.name}`,
    `Soll ${order.requestedQuantity} · Erhalten ${order.receivedQuantity} · Offen ${Math.max(order.requestedQuantity - order.receivedQuantity, 0)} ${order.article.unit}`
  ];
  if (order.article.manufacturer) details.push(`Hersteller: ${order.article.manufacturer}`);
  if (order.article.manufacturerPartNumber) details.push(`Art.-Nr.: ${order.article.manufacturerPartNumber}`);
  return details;
}

function matchesProcurementFilters(filters: ProcurementPdfFilters, order: ProcurementOrderReportRecord) {
  if (filters.articleId && filters.articleId !== order.articleId) return false;
  if (filters.locationId && filters.locationId !== order.locationId) return false;
  const q = filters.q?.trim().toLowerCase();
  if (!q) return true;
  return [
    order.id,
    order.article.name,
    order.location.name,
    ...order.receipts.map((receipt) => receipt.lotNumber)
  ].some((value) => value.toLowerCase().includes(q));
}

function summarizeProcurementFilters(filters: ProcurementPdfFilters) {
  const parts = [
    filters.articleId ? `Artikel ${filters.articleId}` : "",
    filters.locationId ? `Standort ${filters.locationId}` : "",
    filters.q ? `Suche ${filters.q}` : ""
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Keine";
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin"
  }).format(value);
}

function mmToPt(value: number) {
  return value * 2.8346456693;
}
