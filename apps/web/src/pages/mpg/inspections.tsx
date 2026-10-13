import { useRef, useState } from "react";
import { CheckCircle2, Pencil, Plus, RotateCcw } from "lucide-react";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { Button, Field } from "../../components/ui";
import { uploadMpgDeviceDocument, useMpg, useMpgAction } from "./api";
import { MpgDataTable } from "./data-table";
import { type FormValues } from "./form";
import { MpgFormDialog } from "./form-dialog";
import { inspectionFields, inspectionFinalizeFields } from "./inspection-form-fields";
import { MpgStatus, textField } from "./shared";
import { displayDate, statusLabel, type Device, type Document, type Person, type Inspection } from "./types";

type DialogKind = "create-complete" | "create-draft" | "edit" | "correct" | "finalize" | null;

export function Inspections({ device, people }: { device: Device; people: Person[] }) {
  const documents = useMpg<Document[]>(`/documents?deviceId=${device.id}`);
  const action = useMpgAction();
  const [selectedId, setSelectedId] = useState("");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const uploadedReportId = useRef<string | null>(null);
  const selected = device.inspections.find(inspection => inspection.id === selectedId) ?? device.inspections[0] ?? null;
  const existing = documents.data ?? [];
  const draftFields = inspectionFields(device, people, existing, false);
  const completeFields = inspectionFields(device, people, existing, true);
  const columns: DataTableColumn<Inspection>[] = [
    { id: "inspection", label: "Prüfung", render: row => <strong>{row.requirement?.title ?? "Prüfung"}</strong>, sortValue: row => row.requirement?.title ?? "" },
    { id: "date", label: "Durchgeführt", render: row => displayDate(row.performedAt), sortValue: row => row.performedAt, width: "140px" },
    { id: "result", label: "Ergebnis", render: row => <MpgStatus value={row.result} />, sortValue: row => statusLabel(row.result), width: "140px" },
    { id: "record", label: "Nachweis", render: row => row.finalizedAt ? "Abgeschlossen" : "Entwurf", sortValue: row => row.finalizedAt ? 1 : 0, width: "140px" }
  ];
  const open = (kind: DialogKind) => { setReportFile(null); uploadedReportId.current = null; setDialog(kind); };
  const close = () => { setDialog(null); setReportFile(null); uploadedReportId.current = null; };
  const withReport = async (values: FormValues) => {
    if (!reportFile) return values;
    if (!uploadedReportId.current) uploadedReportId.current = await uploadMpgDeviceDocument(device.id, reportFile);
    return { ...values, reportDocumentId: uploadedReportId.current };
  };
  const initial = selected ? Object.fromEntries(Object.entries(selected).filter(([key, value]) =>
    key !== "nextDueAt" && (typeof value === "string" || typeof value === "number") && completeFields.some(field => field.name === key))
    .map(([key, value]) => [key, key.endsWith("At") ? String(value).slice(0, 10) : value])) as FormValues : {};
  if (selected?.nextDueReason && selected.nextDueAt) {
    initial.nextDueAt = selected.nextDueAt.slice(0, 10);
    initial.nextDueReason = selected.nextDueReason;
    initial.nextDueSource = selected.nextDueSource ?? "";
  }
  const fileField = <Field label="Neues Prüfprotokoll hochladen"><input accept="application/pdf,image/jpeg,image/png" onChange={event => { setReportFile(event.target.files?.[0] ?? null); uploadedReportId.current = null; }} type="file" /></Field>;

  return <>
    <section className="mpg-detail-section"><header><div><h3>Prüfungen und Wartung</h3><p>Fertige Nachweise können direkt abgeschlossen werden; Entwürfe bleiben bearbeitbar.</p></div><div className="mpg-row-actions"><Button onClick={() => open("create-draft")} type="button" variant="secondary">Entwurf anlegen</Button><Button onClick={() => open("create-complete")} type="button"><Plus data-icon="inline-start" />Prüfung abschließen</Button></div></header>
      <MpgDataTable columns={columns} emptyMessage="Noch keine Prüfungen dokumentiert." getRowId={row => row.id} onRowClick={row => setSelectedId(row.id)} rows={device.inspections} selectedRowId={selected?.id} />
    </section>
    {selected ? <section aria-label="Ausgewählte Prüfung" className="mpg-detail-section"><header><div><h3>{selected.requirement?.title ?? "Prüfung"}</h3><p>{displayDate(selected.performedAt)} · <MpgStatus value={selected.result} /> · {selected.finalizedAt ? "Abgeschlossen" : "Entwurf"}</p></div><div className="mpg-row-actions">{selected.finalizedAt ? <Button onClick={() => open("correct")} type="button" variant="secondary"><RotateCcw data-icon="inline-start" />Nachtrag</Button> : <><Button onClick={() => open("edit")} type="button" variant="secondary"><Pencil data-icon="inline-start" />Entwurf bearbeiten</Button><Button onClick={() => open("finalize")} type="button"><CheckCircle2 data-icon="inline-start" />Abschließen</Button></>}</div></header><p>{selected.notes || "Keine Bemerkungen"}</p></section> : null}
    <MpgFormDialog fields={completeFields} intent="create" onClose={close} onSubmit={async values => action.mutateAsync({ path: `/devices/${device.id}/inspections`, body: { ...await withReport(values), finalize: true } })} open={dialog === "create-complete"} size="wide" submitLabel="Verbindlich abschließen" title="Prüfung erfassen und abschließen">{fileField}</MpgFormDialog>
    <MpgFormDialog fields={draftFields} intent="create" onClose={close} onSubmit={async values => action.mutateAsync({ path: `/devices/${device.id}/inspections`, body: await withReport(values) })} open={dialog === "create-draft"} size="wide" submitLabel="Entwurf speichern" title="Prüfentwurf anlegen">{fileField}</MpgFormDialog>
    {selected ? <>
      <MpgFormDialog fields={draftFields} initial={initial} onClose={close} onSubmit={async values => action.mutateAsync({ path: `/inspections/${selected.id}`, method: "PATCH", body: { ...await withReport(values), version: selected.version } })} open={dialog === "edit"} size="wide" submitLabel="Entwurf speichern" title="Prüfentwurf bearbeiten">{fileField}</MpgFormDialog>
      <MpgFormDialog fields={[...completeFields, textField("reason", "Berichtigungsgrund")]} initial={initial} onClose={close} onSubmit={async values => action.mutateAsync({ path: `/inspections/${selected.id}/correct`, body: { ...await withReport(values), finalize: true } })} open={dialog === "correct"} size="wide" submitLabel="Nachtrag abschließen" title="Berichtigung als Nachtrag">{fileField}</MpgFormDialog>
      <MpgFormDialog description="Der abgeschlossene Nachweis bleibt unveränderlich. STK und MTK brauchen ein vollständiges Prüfprotokoll; bei bestandener Prüfung muss das Gerät gekennzeichnet sein." fields={inspectionFinalizeFields(selected, existing)} initial={{ reportDocumentId: selected.reportDocumentId ?? "" }} onClose={close} onSubmit={async values => action.mutateAsync({ path: `/inspections/${selected.id}/finalize`, body: { ...await withReport(values), version: selected.version } })} open={dialog === "finalize"} size="wide" submitLabel="Verbindlich abschließen" title="Prüfnachweis abschließen">{fileField}</MpgFormDialog>
    </> : null}
  </>;
}
