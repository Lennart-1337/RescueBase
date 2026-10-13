import type { FormField, FormValues } from "./form";
import { dateField, textField } from "./shared";
import { options, statusLabel, type Device, type Document, type Inspection, type Person } from "./types";

const technical = (device: Device, values: FormValues) => device.requirements?.some(requirement =>
  requirement.id === values.requirementId && ["STK", "MTK"].includes(requirement.kind)) ?? false;

export function inspectionFields(device: Device, people: Person[], documents: Document[], completion: boolean): FormField[] {
  const fields: FormField[] = [
    { name: "requirementId", label: "Prüfanforderung", group: "Prüfung", required: true,
      options: (device.requirements ?? []).map(requirement => ({ value: requirement.id, label: `${requirement.kind} · ${requirement.title}` })) },
    { ...dateField("performedAt", "Durchführungstag", true), group: "Prüfung" },
    { name: "result", label: "Ergebnis", group: "Prüfung", required: true,
      options: ["PASSED", "FAILED"].map(value => ({ value, label: statusLabel(value) })) },
    { name: "personId", label: "Interne prüfende Person", group: "Prüfende", options: options(people.filter(person => person.active)) },
    { ...textField("externalName", "Name der externen prüfenden Person", false), group: "Prüfende" },
    { ...textField("externalCompany", "Externe Prüffirma", false), group: "Prüfende" },
    { ...textField("qualification", "Qualifikation / Nachweis", false), group: "Prüfende" },
    { name: "reportDocumentId", label: "Hinterlegtes Prüfprotokoll", group: "Nachweis", options: documents.map(document => ({ value: document.id, label: `${document.filename} · v${document.version}` })) },
    { name: "notes", label: "Bemerkungen", group: "Nachweis", type: "textarea" },
    { ...dateField("nextDueAt", "Abweichende frühere Fälligkeit"), group: "Fälligkeit" },
    { ...textField("nextDueReason", "Begründung", false), group: "Fälligkeit", showWhen: values => Boolean(values.nextDueAt) },
    { ...textField("nextDueSource", "Quelle", false), group: "Fälligkeit", showWhen: values => Boolean(values.nextDueAt) }
  ];
  if (completion) fields.push(
    { name: "protocolConfirmed", label: "Das Prüfprotokoll enthält Messwerte, Messverfahren und Beurteilung.", type: "checkbox", group: "Abschluss", showWhen: values => technical(device, values) },
    { name: "markingConfirmed", label: "Die vorgeschriebene Kennzeichnung ist am Gerät angebracht.", type: "checkbox", group: "Abschluss", showWhen: values => technical(device, values) && values.result === "PASSED" }
  );
  return fields;
}

export function inspectionFinalizeFields(inspection: Inspection, documents: Document[]): FormField[] {
  const fields: FormField[] = [{ name: "reportDocumentId", label: "Hinterlegtes Prüfprotokoll", options: documents.map(document => ({ value: document.id, label: `${document.filename} · v${document.version}` })) }];
  if (["STK", "MTK"].includes(inspection.requirement?.kind ?? "")) fields.push(
    { name: "protocolConfirmed", label: "Das Prüfprotokoll enthält Messwerte, Messverfahren und Beurteilung.", type: "checkbox" },
    ...(inspection.result === "PASSED" ? [{ name: "markingConfirmed", label: "Die vorgeschriebene Kennzeichnung ist am Gerät angebracht.", type: "checkbox" as const }] : [])
  );
  return fields;
}
