import { Injectable } from "@nestjs/common";
import QRCode from "qrcode";
import { PrismaService } from "../persistence/prisma.service.js";
import { MpgDevicesService } from "./mpg-devices.service.js";
import { MpgDocumentsService } from "./mpg-documents.service.js";
import { createMpgPdf, drawReportSignature, reportEntry, reportFields, reportNote, reportSection } from "./mpg-report-pdf.js";
import { zip } from "./mpg-zip.js";

@Injectable()
export class MpgReportsService {
  constructor(private readonly db: PrismaService, private readonly devices: MpgDevicesService, private readonly documents: MpgDocumentsService) {}

  async inventory() {
    const devices = await this.devices.list();
    return createMpgPdf("Bestandsverzeichnis Medizinprodukte", `${devices.length} Geräte · erstellt am ${day(new Date())}`, (doc) => {
      reportNote(doc, "Dieses Bestandsverzeichnis dokumentiert die aktuell in RescueBase geführten MPG-Geräte. Verbrauchsmaterial und Lagerartikel sind nicht Bestandteil dieses Verzeichnisses.");
      devices.forEach((device) => reportEntry(doc, device.name, [
        `Status: ${status(device.status)} · Inventarnummer: ${device.inventoryNumber ?? "—"}`,
        `Hersteller / Modell: ${device.mpgModel?.manufacturer ?? "—"} · ${device.mpgModel?.name ?? "—"} · ${device.mpgModel?.productType ?? "Nicht festgelegt"}`,
        `Serien- oder Losnummer: ${device.serialNumber ?? device.lotCode ?? "—"} · Anschaffungsjahr: ${device.acquisitionYear ?? "—"}`,
        `Standort: ${device.location.name}${device.kit?.name ? ` · Rucksack: ${device.kit.name}` : ""}`
      ]));
    });
  }

  async deviceBook(id: string) {
    const device = await this.devices.get(id);
    return createMpgPdf(`Medizinproduktebuch · ${device.name}`, `Inventarnummer: ${device.inventoryNumber ?? "—"} · Stand: ${day(new Date())}`, (doc) => {
      reportSection(doc, "Geräteidentifikation");
      reportFields(doc, [["Gerät", device.name], ["Status", status(device.status)], ["Inventarnummer", device.inventoryNumber ?? "—"], ["Serien-/Losnummer", device.serialNumber ?? device.lotCode ?? "—"], ["Anschaffungsjahr", String(device.acquisitionYear ?? "—")], ["Inbetriebnahme", day(device.commissionedAt)], ["Standort", device.location.name], ["Rucksack", device.kit?.name ?? "—"]]);
      reportSection(doc, "Modell und Hersteller");
      reportFields(doc, [["Hersteller", device.mpgModel?.manufacturer ?? "—"], ["Produktart", device.mpgModel?.productType ?? "—"], ["Modell", device.mpgModel?.name ?? "—"], ["Herstelleranschrift", device.mpgModel?.manufacturerAddress ?? "—"], ["Gebrauchsanweisung", device.mpgModel?.instructionsDocumentId ? "Hinterlegt" : "Nicht hinterlegt"], ["Modellprüfung", device.mpgModel?.requirementsReviewedAt ? `Dokumentiert am ${day(device.mpgModel.requirementsReviewedAt)}` : "Nicht dokumentiert"]]);
      reportSection(doc, "Freigabe und aktueller Zustand");
      reportFields(doc, [["Freigabe", device.releasedAt ? `Dokumentiert am ${day(device.releasedAt)}` : "Nicht dokumentiert"], ["Außerbetriebnahme", device.retiredAt ? `${day(device.retiredAt)} · ${device.retirementReason ?? "—"}` : "—"]]);
      if (device.reasons.length) device.reasons.forEach((reason) => reportEntry(doc, "Aktueller Sperr- oder Erfassungsgrund", [String(reason)]));
      else reportNote(doc, "Aktuell sind keine Sperrgründe dokumentiert.");
      reportSection(doc, "Prüfanforderungen");
      if (device.requirements.length) device.requirements.forEach((requirement) => reportEntry(doc, `${requirement.kind} · ${requirement.title}`, [
        `Art: ${requirement.mandatory ? "Pflichtprüfung" : "Weitere Kontrolle"} · Fälligkeit: ${day(requirement.dueDate)}`,
        `Quelle: ${requirement.source}`, `Begründung: ${requirement.justification ?? "—"}`
      ])); else reportNote(doc, "Für dieses Gerät sind noch keine Prüfanforderungen hinterlegt.");
      reportSection(doc, "Prüfungen und Wartungen");
      const inspections = device.inspections.filter((inspection) => inspection.finalizedAt);
      if (inspections.length) inspections.forEach((inspection) => reportEntry(doc, `${inspection.requirement.title} · ${day(inspection.performedAt)}`, [
        `Ergebnis: ${inspection.result === "PASSED" ? "Bestanden" : "Nicht bestanden"} · Abgeschlossen: ${day(inspection.finalizedAt)}`,
        `Prüfende Stelle: ${inspection.externalCompany ? `${inspection.externalName ?? "—"}, ${inspection.externalCompany}` : inspection.personId ?? "Interne Person"}`,
        `Qualifikation / Nachweis: ${inspection.qualification ?? "—"} · Nächste Fälligkeit: ${day(inspection.nextDueAt)}`,
        `Prüfbericht: ${inspection.reportDocumentId ?? "Nicht hinterlegt"} · Bemerkungen: ${inspection.notes ?? "—"}`
      ])); else reportNote(doc, "Es liegen noch keine abgeschlossenen Prüfungen oder Wartungen vor.");
      reportSection(doc, "Einweisungen");
      const trainings = device.trainings.filter((training) => training.finalizedAt);
      if (trainings.length) trainings.forEach((training) => reportEntry(doc, `Einweisung vom ${day(training.performedAt)}`, [
        "Geltungsbereich: alle baugleichen Geräte dieses Modells.", `Inhalte: ${training.contents}`,
        `Beteiligte: ${training.confirmations.map((confirmation) => `${confirmation.nameSnapshot} (${confirmation.role === "INSTRUCTOR" ? "einweisend" : "teilnehmend"})`).join(", ")}`
      ])); else reportNote(doc, "Für das zugehörige Modell sind noch keine abgeschlossenen Einweisungen dokumentiert.");
      reportSection(doc, "BZ-Qualitätskontrollen");
      if (device.glucoseControls.length) device.glucoseControls.forEach((control) => reportEntry(doc, `${day(control.performedAt)} · ${control.passed ? "Bestanden" : "Nicht bestanden"}`, [
        `Messwert: ${control.value} ${control.unit} · Sollbereich: ${control.targetMin}–${control.targetMax} ${control.targetUnit}`,
        `Kontrollmittel: ${control.solutionName}, Charge ${control.solutionLot}, Verfall ${day(control.solutionExpiresAt)} · Teststreifencharge: ${control.stripLot}`,
        `Kontrollniveau: ${control.controlLevel} · Klärung: ${control.clarification ?? "—"} · Behoben: ${day(control.resolvedAt)}`
      ])); else reportNote(doc, "Für dieses Gerät sind keine BZ-Qualitätskontrollen dokumentiert.");
      reportSection(doc, "Vorkommnisse und Maßnahmen");
      if (device.incidents.length) device.incidents.forEach((incident) => reportEntry(doc, `${day(incident.occurredAt)} · ${incident.safetyRelevant ? "Sicherheitsrelevant" : "Vorkommnis"}`, [
        `Beschreibung: ${incident.description}`, `Auswirkungen: ${incident.effects}`, `Maßnahmen: ${incident.measures}`,
        `Status: ${incident.status} · Meldung: ${day(incident.reportedAt)} · Referenz: ${incident.reportReference ?? "—"}`
      ])); else reportNote(doc, "Es sind keine Vorkommnisse dokumentiert.");
      reportSection(doc, "Dokumente und Verlauf");
      if (device.documents?.length) device.documents.forEach((document) => reportEntry(doc, document.filename, [`Version ${document.version} · hochgeladen am ${day(document.createdAt)} · Prüfsumme: ${document.sha256}`]));
      else reportNote(doc, "Es sind keine Dokumente direkt an Gerät oder Modell hinterlegt.");
      if (device.assignments.length) device.assignments.forEach((assignment) => reportEntry(doc, `Zuordnung seit ${day(assignment.startedAt)}`, [`Standort-ID: ${assignment.locationId} · Rucksack-ID: ${assignment.kitId ?? "—"}`, `Ende: ${day(assignment.endedAt)} · dokumentiert durch: ${assignment.actorId}`]));
      device.history?.forEach((event) => reportEntry(doc, `${day(event.createdAt)} · ${event.action}`, [`Bearbeitet durch: ${event.actorId ?? "—"}`]));
    });
  }

  async label(id: string) {
    const device = await this.devices.get(id);
    const url = `${process.env.APP_PUBLIC_URL ?? "http://localhost:5173"}/admin/mpg?device=${encodeURIComponent(id)}`;
    const qr = await QRCode.toBuffer(url, { type: "png", margin: 1, width: 350 });
    return createMpgPdf(`Geräteetikett · ${device.name}`, "QR-Code öffnet die geschützte Geräteakte nach Anmeldung.", (doc) => {
      doc.image(qr, 48, 145, { width: 190 });
      doc.font("Helvetica-Bold").fontSize(18).fillColor("#17202c").text(device.name, 260, 150, { width: 280 });
      doc.font("Helvetica").fontSize(11).fillColor("#425466").text(`Inventarnummer: ${device.inventoryNumber ?? "—"}\nModell: ${device.mpgModel?.manufacturer ?? "—"} · ${device.mpgModel?.name ?? "—"}\nStatus: ${status(device.status)}\nStandort: ${device.location.name}`, 260, 190, { width: 280, lineGap: 4 });
    });
  }

  async training(id: string) {
    const training = await this.db.mpgTraining.findUniqueOrThrow({ where: { id }, include: { confirmations: true, model: true, instructor: true } });
    return createMpgPdf("Einweisungsnachweis", `${training.model.manufacturer} · ${training.model.name} · ${day(training.performedAt)}`, (doc) => {
      reportSection(doc, "Einweisung");
      reportFields(doc, [["Modell", `${training.model.manufacturer} · ${training.model.name}`], ["Datum", day(training.performedAt)], ["Einweisende Person", training.instructor.name], ["Abgeschlossen", day(training.finalizedAt)], ["Geltungsbereich", "Alle baugleichen Geräte dieses Modells"], ["Dokumentversion", training.documentId ?? "Nicht hinterlegt"]]);
      reportEntry(doc, "Dokumentierte Inhalte", [training.contents]);
      reportSection(doc, "Einzelne Bestätigungen");
      training.confirmations.forEach((confirmation) => { reportEntry(doc, confirmation.nameSnapshot, [
        `Rolle: ${confirmation.role === "INSTRUCTOR" ? "Einweisende Person" : "Teilnehmende Person"}`, `Bestätigung: ${confirmation.confirmationText || "Nicht bestätigt"}`,
        `Zeitpunkt: ${day(confirmation.confirmedAt)} · Signatur-Prüfsumme: ${confirmation.signatureHash ?? "—"}`
      ]); drawReportSignature(doc, confirmation.signaturePngDataUrl); });
    });
  }

  async person(id: string) {
    const [person, confirmations] = await Promise.all([this.db.mpgPerson.findUniqueOrThrow({ where: { id } }), this.db.mpgTrainingConfirmation.findMany({ where: { personId: id, training: { finalizedAt: { not: null } } }, include: { training: { include: { model: true, instructor: true } } }, orderBy: { confirmedAt: "desc" } })]);
    return createMpgPdf(`Einweisungsübersicht · ${person.name}`, `Stand: ${day(new Date())}`, (doc) => {
      reportSection(doc, "Person");
      reportFields(doc, [["Name", person.name], ["Geburtsdatum", day(person.birthDate)], ["Status", person.active ? "Aktiv" : "Deaktiviert"], ["Einweisungsberechtigung", person.instructorAuthorized ? "Ja" : "Nein"], ["Beauftragung", person.instructorAuthorization ?? "—"], ["Gültig bis", day(person.authorizationValidUntil)]]);
      reportSection(doc, "Abgeschlossene Einweisungen");
      if (confirmations.length) confirmations.forEach((confirmation) => reportEntry(doc, `${day(confirmation.training.performedAt)} · ${confirmation.training.model.manufacturer} ${confirmation.training.model.name}`, [
        `Rolle: ${confirmation.role === "INSTRUCTOR" ? "Einweisende Person" : "Teilnehmende Person"} · Einweisende Person: ${confirmation.training.instructor.name}`,
        `Bestätigung: ${confirmation.confirmationText} · Zeitpunkt: ${day(confirmation.confirmedAt)}`, `Signatur-Prüfsumme: ${confirmation.signatureHash ?? "—"}`
      ])); else reportNote(doc, "Für diese Person sind keine abgeschlossenen Einweisungen dokumentiert.");
    });
  }

  async archive(id: string) {
    const device = await this.devices.get(id);
    const documents = await this.db.mpgDocument.findMany({ where: { OR: [{ deviceId: id }, ...(device.mpgModelId ? [{ modelId: device.mpgModelId }] : [])] } });
    const entries = [{ name: "geraeteakte.json", data: Buffer.from(JSON.stringify(device, null, 2)) }, { name: "medizinproduktebuch.pdf", data: await this.deviceBook(id) }];
    for (const document of documents) { const file = await this.documents.read(document.id); entries.push({ name: `dokumente/${document.id}-${document.filename}`, data: file.buffer }); }
    return zip(entries);
  }
}

function day(value?: Date | string | null) { return value ? new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin" }).format(new Date(value)) : "—"; }
function status(value: string) { return ({ DRAFT: "In Erfassung – nicht freigegeben", BLOCKED: "Gesperrt", RELEASED: "Freigegeben", RETIRED: "Außer Betrieb" } as Record<string, string>)[value] ?? value; }
