import { Injectable, NotFoundException } from "@nestjs/common";
import { InventoryProcurementStatus } from "@prisma/client";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { PrismaService } from "../persistence/prisma.service.js";
import type { BatchRecord, OrderRecord } from "../persistence/mappers.js";
import { createQrSheetLayout, needsPageBreak } from "./report-layout.js";

const palette = {
  ink: "#173042",
  muted: "#5d7686",
  accent: "#1f6f8b",
  accentSoft: "#d9ecf3",
  critical: "#b42318",
  line: "#d3dde4",
  paper: "#ffffff",
  stripe: "#f5f8fa"
};

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
      this.drawDocumentHeader(doc, "Beschaffung", "Einkaufsliste", filtered.length > 0 ? "Aktuell benötigte Artikel" : "Keine offenen Bedarfe");
      this.drawMetaGrid(doc, [
        ["Positionen", String(filtered.length)],
        ["Offene Menge", String(totalRemaining)],
        ["Filter", filterLabel],
        ["Stand", formatDateTime(new Date())]
      ], { x: 48, width: doc.page.width - 96 });

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

      let y = doc.y + 8;
      filtered.forEach((order, index) => {
        const cardHeight = this.measureProcurementOrderCard(doc, order);
        if (needsPageBreak({
          currentY: y,
          requiredHeight: cardHeight,
          pageHeight: doc.page.height,
          bottomMargin: doc.page.margins.bottom,
          reserve: 24
        })) {
          doc.addPage();
          this.drawContinuationHeader(doc, "Einkaufsliste", "Beschaffungsaufträge · Fortsetzung");
          y = doc.y + 16;
        }
        y = this.drawProcurementOrderCard(doc, y, order, index);
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
      return this.renderPdf((doc) => this.drawQrLabel(doc, kit, publicUrl, qrImage), {
        margin: 14,
        size: [mmToPt(90), mmToPt(62)]
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
        `Positionen ${order.items.length}`,
        `Soll ${totalRequested}`,
        `Erfüllt ${totalFulfilled}`,
        `Offen ${Math.max(totalRequested - totalFulfilled, 0)}`
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
    doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(11).text("Direktlink", 48, linkTop);
    doc.font("Helvetica").fontSize(9).fillColor(palette.muted).text(publicUrl, 48, linkTop + 18, {
      width: doc.page.width - 96
    });
    doc.fillColor(palette.muted).fontSize(9).text(
      "Hinweis: Bei Tokenrotation muss dieses Etikett ersetzt werden. Das alte Etikett verliert danach sofort seine Gültigkeit.",
      48,
      linkTop + 54,
      { width: doc.page.width - 96 }
    );
  }

  private drawQrLabel(doc: PDFKit.PDFDocument, kit: { name: string; code: string; location: { name: string } }, publicUrl: string, qrImage: Buffer) {
    const margin = 14;
    const qrSize = 60;
    const qrX = doc.page.width - margin - qrSize - 6;
    const textWidth = qrX - margin - 12;
    const compactUrl = this.fitSingleLine(doc.font("Helvetica").fontSize(6), publicUrl.replace(/^https?:\/\//, ""), doc.page.width - margin * 2 - 16);
    doc.roundedRect(margin, margin, doc.page.width - margin * 2, doc.page.height - margin * 2, 8).fillAndStroke("#fbfdff", palette.line);
    doc.rect(margin, margin, doc.page.width - margin * 2, 14).fill(palette.accent);
    doc.fillColor(palette.paper).font("Helvetica-Bold").fontSize(8).text("RESCUEBASE CHECK", margin + 8, margin + 4);
    doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(13).text(kit.code, margin + 8, 34, { width: textWidth });
    doc.font("Helvetica").fontSize(8).fillColor(palette.muted).text(kit.name, margin + 8, 51, { width: textWidth, height: 24 });
    doc.fontSize(7).text(kit.location.name, margin + 8, 79, { width: textWidth });
    doc.image(qrImage, qrX, 33, { width: qrSize, height: qrSize });
    doc.fillColor(palette.muted).font("Helvetica-Bold").fontSize(6).text("Scan für Check", qrX - 2, 96, { width: qrSize + 4, align: "center" });
    doc.font("Helvetica").fontSize(6).text(compactUrl, margin + 8, doc.page.height - 20, { lineBreak: false });
  }

  private drawDocumentHeader(doc: PDFKit.PDFDocument, eyebrow: string, title: string, subtitle: string) {
    doc.rect(48, 48, doc.page.width - 96, 52).fill(palette.accentSoft);
    doc.fillColor(palette.accent).font("Helvetica-Bold").fontSize(9).text(eyebrow.toUpperCase(), 60, 62);
    doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(22).text(title, 60, 74);
    doc.font("Helvetica").fontSize(10).fillColor(palette.muted).text(subtitle, 60, 100);
    doc.y = 144;
  }

  private drawMetaGrid(doc: PDFKit.PDFDocument, rows: Array<[string, string]>, options: { x: number; y?: number; width: number }) {
    let y = options.y ?? doc.y;
    rows.forEach(([label, value]) => {
      const labelWidth = Math.min(96, options.width * 0.32);
      const valueWidth = options.width - labelWidth - 16;
      const valueHeight = doc.font("Helvetica").fontSize(11).heightOfString(value, { width: valueWidth });
      const rowHeight = Math.max(24, valueHeight + 6);
      doc.fillColor(palette.muted).font("Helvetica-Bold").fontSize(8).text(label.toUpperCase(), options.x, y + 4, {
        width: labelWidth
      });
      doc.fillColor(palette.ink).font("Helvetica").fontSize(11).text(value, options.x + labelWidth + 16, y + 2, {
        width: valueWidth
      });
      doc.moveTo(options.x, y + rowHeight).lineTo(options.x + options.width, y + rowHeight).strokeColor(palette.line).stroke();
      y += rowHeight + 10;
    });
    doc.y = y;
  }

  private drawSummaryLine(doc: PDFKit.PDFDocument, items: string[]) {
    doc.moveDown(0.8);
    doc.fillColor(palette.accent).font("Helvetica-Bold").fontSize(9).text(items.join("  •  "), 48, doc.y);
  }

  private drawTableHeader(doc: PDFKit.PDFDocument, y: number, headers: string[]) {
    doc.fillColor(palette.muted).font("Helvetica-Bold").fontSize(8);
    doc.text(headers[0] ?? "", 56, y);
    doc.text(headers[1] ?? "", 255, y);
    doc.text(headers[2] ?? "", 358, y, { width: 40, align: "right" });
    doc.text(headers[3] ?? "", 418, y, { width: 44, align: "right" });
    doc.text(headers[4] ?? "", 482, y, { width: 48, align: "right" });
    doc.moveTo(48, y + 14).lineTo(doc.page.width - 48, y + 14).strokeColor(palette.line).stroke();
    return y + 22;
  }

  private drawContinuationHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
    doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(16).text(title, 48, 48);
    doc.font("Helvetica").fontSize(9).fillColor(palette.muted).text(subtitle, 48, 68);
    doc.moveTo(48, 88).lineTo(doc.page.width - 48, 88).strokeColor(palette.line).stroke();
    doc.y = 98;
  }

  private drawQrCard(doc: PDFKit.PDFDocument, box: { x: number; y: number; width: number; height: number }, qrImage: Buffer) {
    doc.roundedRect(box.x - 12, box.y - 12, box.width + 24, box.height + 42, 12).fillAndStroke("#fbfdff", palette.line);
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
      doc.rect(48, y - 4, doc.page.width - 96, rowHeight + 4).fill(palette.stripe);
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
    doc.moveTo(48, y + rowHeight + 4).lineTo(doc.page.width - 48, y + rowHeight + 4).strokeColor(palette.line).stroke();
    return y + rowHeight + 10;
  }

  private drawOperationalNotes(doc: PDFKit.PDFDocument, y: number) {
    doc.moveTo(48, y).lineTo(doc.page.width - 48, y).strokeColor(palette.line).stroke();
    doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(11).text("Operative Hinweise", 48, y + 14);
    doc.font("Helvetica").fontSize(9).fillColor(palette.muted)
      .text("Chargen bitte im System buchen. Teilfüllungen und Restmengen müssen nachvollziehbar bleiben.", 48, y + 30, {
        width: doc.page.width - 96
      });
    doc.moveTo(48, y + 82).lineTo(doc.page.width - 48, y + 82).strokeColor(palette.line).stroke();
    doc.moveTo(48, y + 116).lineTo(240, y + 116).strokeColor(palette.line).stroke();
    doc.moveTo(320, y + 116).lineTo(doc.page.width - 48, y + 116).strokeColor(palette.line).stroke();
    doc.fillColor(palette.muted).fontSize(8).text("Bearbeitet von", 48, y + 120).text("Datum / Unterschrift", 320, y + 120);
  }

  private fitSingleLine(doc: PDFKit.PDFDocument, text: string, width: number) {
    if (doc.widthOfString(text) <= width) {
      return text;
    }
    let result = text;
    while (result.length > 1 && doc.widthOfString(`${result}...`) > width) {
      result = result.slice(0, -1);
    }
    return `${result}...`;
  }

  private measureProcurementOrderCard(doc: PDFKit.PDFDocument, order: ProcurementOrderReportRecord) {
    const details = procurementDetails(order);
    const titleHeight = doc.font("Helvetica-Bold").fontSize(12).heightOfString(order.article.name, { width: 300 });
    const detailHeight = doc.font("Helvetica").fontSize(9).heightOfString(details.join("\n"), { width: 300 });
    const articleUrl = order.article.articleUrl ?? order.articleUrlSnapshot;
    const linkHeight = articleUrl
      ? doc.font("Helvetica").fontSize(8).heightOfString(articleUrl, { width: 300 }) + 18
      : 0;
    return 28 + titleHeight + detailHeight + linkHeight;
  }

  private drawProcurementOrderCard(doc: PDFKit.PDFDocument, y: number, order: ProcurementOrderReportRecord, index: number) {
    const x = 48;
    const width = doc.page.width - 96;
    const height = this.measureProcurementOrderCard(doc, order);
    const remainingQuantity = Math.max(order.requestedQuantity - order.receivedQuantity, 0);
    const articleUrl = order.article.articleUrl ?? order.articleUrlSnapshot;
    const details = procurementDetails(order);

    doc.roundedRect(x, y, width, height, 12).fillAndStroke(index % 2 === 0 ? "#fbfdff" : palette.paper, palette.line);
    doc.fillColor(procurementStatusColor(order.status)).font("Helvetica-Bold").fontSize(8).text(
      formatProcurementStatus(order.status).toUpperCase(),
      x + 18,
      y + 16
    );
    doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(12).text(order.article.name, x + 18, y + 32, { width: 300 });
    doc.fillColor(palette.muted).font("Helvetica").fontSize(9).text(details.join("\n"), x + 18, y + 52, { width: 300 });
    doc.fillColor(palette.accent).font("Helvetica-Bold").fontSize(8).text("OFFEN", x + width - 88, y + 18, { width: 56, align: "right" });
    doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(24).text(String(remainingQuantity), x + width - 92, y + 30, { width: 64, align: "right" });
    doc.fillColor(palette.muted).font("Helvetica").fontSize(8).text(order.article.unit, x + width - 92, y + 58, { width: 64, align: "right" });

    if (articleUrl) {
      const linkY = y + height - 28;
      doc.fillColor(palette.muted).font("Helvetica-Bold").fontSize(8).text("Shop-Link", x + 18, linkY);
      doc.fillColor(palette.accent).font("Helvetica").fontSize(8).text(articleUrl, x + 74, linkY, {
        width: width - 92,
        link: articleUrl,
        underline: true
      });
    }

    return y + height + 12;
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
  if (status === "IN_PROGRESS") {
    return "In Arbeit";
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

function procurementStatusColor(status: InventoryProcurementStatus) {
  return status === InventoryProcurementStatus.OPEN ? "#b54708" : palette.accent;
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
