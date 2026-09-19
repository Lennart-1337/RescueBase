import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { PrismaService } from "../persistence/prisma.service.js";
import { MpgDevicesService } from "./mpg-devices.service.js";
import { MpgDocumentsService } from "./mpg-documents.service.js";
import { zip } from "./mpg-zip.js";

@Injectable()
export class MpgReportsService {
  constructor(private readonly db: PrismaService, private readonly devices: MpgDevicesService, private readonly documents: MpgDocumentsService) {}

  async inventory() {
    const devices = await this.devices.list();
    const rows = devices.map(d => ({ Bezeichnung: d.name, Art: d.mpgModel?.productType ?? "Nicht festgelegt", Typ: d.mpgModel?.name ?? "Nicht festgelegt",
      "Serien-/Losnummer": d.serialNumber ?? d.lotCode ?? "", Anschaffungsjahr: d.acquisitionYear ?? "", Hersteller: d.mpgModel?.manufacturer ?? "",
      Herstelleranschrift: d.mpgModel?.manufacturerAddress ?? "", Inventarnummer: d.inventoryNumber ?? "", Standort: d.location.name,
      Zuordnung: d.kit?.name ?? "", Status: status(d.status) }));
    return pdf("Bestandsverzeichnis Medizinprodukte", doc => rows.forEach(row => block(doc, String(row.Bezeichnung), [
      `${row.Hersteller} · ${row.Typ} · ${row.Art}`, `Serien-/Losnummer: ${row["Serien-/Losnummer"] || "—"} · Anschaffungsjahr: ${row.Anschaffungsjahr || "—"}`,
      `Inventarnummer: ${row.Inventarnummer || "—"} · Standort: ${row.Standort}${row.Zuordnung ? ` / ${row.Zuordnung}` : ""}`, `Status: ${row.Status}`])));
  }

  async deviceBook(id: string) {
    const d = await this.devices.get(id);
    return pdf(`Medizinproduktebuch · ${d.name}`, doc => {
      block(doc, "Identifikation", [`Inventarnummer: ${d.inventoryNumber ?? "—"}`, `Serien-/Losnummer: ${d.serialNumber ?? d.lotCode ?? "—"}`,
        `Modell: ${d.mpgModel?.manufacturer ?? "—"} ${d.mpgModel?.name ?? ""}`, `Standort: ${d.location.name} · Status: ${status(d.status)}`]);
      d.inspections.filter(i => i.finalizedAt).forEach(i => block(doc, `${i.requirement.title} · ${day(i.performedAt)}`,
        [`Ergebnis: ${i.result === "PASSED" ? "Bestanden" : "Nicht bestanden"}`, `Prüfer: ${i.externalCompany ?? i.personId ?? "—"}`, `Nächste Fälligkeit: ${day(i.nextDueAt)}`]));
      d.trainings.filter(t => t.finalizedAt).forEach(t => block(doc, `Einweisung · ${day(t.performedAt)}`, [`Geltungsbereich: ausgewähltes Modell`, `Beteiligte: ${t.confirmations.map(c => c.nameSnapshot).join(", ")}`]));
      d.incidents.forEach(i => block(doc, `Vorkommnis · ${day(i.occurredAt)}`, [i.description, `Auswirkungen: ${i.effects}`, `Maßnahmen: ${i.measures}`, `Status: ${i.status}`, `Meldereferenz: ${i.reportReference ?? "—"}`]));
    });
  }

  async label(id: string) {
    const d = await this.devices.get(id);
    const url = `${process.env.APP_PUBLIC_URL ?? "http://localhost:5173"}/admin/mpg?device=${encodeURIComponent(id)}`;
    const qr = await QRCode.toBuffer(url, { type: "png", margin: 1, width: 350 });
    return pdf(`Geräteetikett · ${d.name}`, doc => { doc.image(qr, 48, 110, { width: 180 }); doc.fontSize(17).font("Helvetica-Bold").text(d.name, 250, 120, { width: 290 });
      doc.fontSize(11).font("Helvetica").text(`Inventarnummer: ${d.inventoryNumber ?? "—"}\n${d.mpgModel?.manufacturer ?? ""} ${d.mpgModel?.name ?? ""}\nQR-Code nur nach Anmeldung zugänglich.`, 250, 160, { width: 290 }); });
  }

  async training(id: string) { const t = await this.db.mpgTraining.findUniqueOrThrow({ where: { id }, include: { confirmations: true, model: true } });
    return pdf("Einweisungsnachweis", doc => { block(doc, `Einweisung vom ${day(t.performedAt)}`, [`Modell: ${t.model.manufacturer} · ${t.model.name}`, t.contents]); t.confirmations.forEach(c => {
      block(doc, c.nameSnapshot, [`Rolle: ${c.role === "INSTRUCTOR" ? "Einweisende Person" : "Teilnehmende Person"}`, c.confirmationText || "Keine Bestätigung", `Bestätigt: ${day(c.confirmedAt)}`, `Signatur-Prüfsumme: ${c.signatureHash ?? "—"}`]);
      drawSignature(doc, c.signaturePngDataUrl);
    }); }); }

  async person(id: string) { const [person, confirmations] = await Promise.all([this.db.mpgPerson.findUniqueOrThrow({ where: { id } }),
    this.db.mpgTrainingConfirmation.findMany({ where: { personId: id, training: { finalizedAt: { not: null } } }, include: { training: { include: { model: true } } }, orderBy: { confirmedAt: "desc" } })]);
    return pdf(`Einweisungsübersicht · ${person.name}`, doc => confirmations.forEach(c => block(doc, day(c.training.performedAt), [`Modell: ${c.training.model.manufacturer} · ${c.training.model.name}`, c.confirmationText]))); }

  async archive(id: string) {
    const device = await this.devices.get(id);
    const docs = await this.db.mpgDocument.findMany({ where: { OR: [{ deviceId: id }, ...(device.mpgModelId ? [{ modelId: device.mpgModelId }] : [])] } });
    const entries = [{ name: "geraeteakte.json", data: Buffer.from(JSON.stringify(device, null, 2)) }, { name: "medizinproduktebuch.pdf", data: await this.deviceBook(id) }];
    for (const meta of docs) { const file = await this.documents.read(meta.id); entries.push({ name: `dokumente/${meta.id}-${meta.filename}`, data: file.buffer }); }
    return zip(entries);
  }
}

function day(value?: Date | string | null) { return value ? new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin" }).format(new Date(value)) : "—"; }
function status(value: string) { return ({ DRAFT: "In Erfassung – nicht freigegeben", BLOCKED: "Gesperrt", RELEASED: "Freigegeben", RETIRED: "Außer Betrieb" } as Record<string, string>)[value] ?? value; }
function block(doc: PDFKit.PDFDocument, title: string, lines: string[]) { if (doc.y > 700) doc.addPage(); doc.font("Helvetica-Bold").fontSize(11).fillColor("#18232d").text(title); doc.font("Helvetica").fontSize(9).fillColor("#425466").text(lines.join("\n")); doc.moveDown(.8); }
function drawSignature(doc: PDFKit.PDFDocument, value?: string | null) { if (!value) return; const data = value.split(",")[1]; if (!data) return; doc.image(Buffer.from(data, "base64"), { fit: [140, 55] }); doc.moveDown(.8); }
function pdf(title: string, draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> { return new Promise(resolve => { const doc = new PDFDocument({ margin: 48, size: "A4", info: { Title: title } });
  const chunks: Buffer[] = []; doc.on("data", (chunk: Buffer) => chunks.push(chunk)); doc.on("end", () => resolve(Buffer.concat(chunks)));
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#18232d").text(title); doc.font("Helvetica").fontSize(8).fillColor("#657482").text(`Erstellt mit RescueBase · ${day(new Date())}`); doc.moveDown(); draw(doc); doc.end(); }); }
