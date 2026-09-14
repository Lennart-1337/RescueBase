import { useState } from "react";
import { AnchorButton, Button, Field } from "../../components/ui";
import { useMpgAction } from "./api";
import { MpgForm } from "./form";
import { Signature } from "./signature";
import { dateField, MpgTable, textField } from "./shared";
import { displayDate, options, type Device, type Training } from "./types";
import type { Catalog } from "./devices";

export function Trainings({ catalog, devices, trainings = [], deviceId }: { catalog: Catalog; devices: Device[]; trainings?: Training[]; deviceId?: string }) {
  const action = useMpgAction();
  const visible = deviceId ? trainings.filter(t => t.deviceId === deviceId || t.modelId === devices[0]?.mpgModelId) : trainings;
  return <section><h2>Einweisungen</h2><MpgTable headings={["Datum", "Geltungsbereich", "Bestätigungen", "Nachweis"]} empty={!visible.length}>{visible.map(training => <tr key={training.id}>
    <td>{displayDate(training.performedAt)}</td><td>{training.scope}</td><td>{training.confirmations.filter(c => c.confirmedAt).length}/{training.confirmations.length}</td>
    <td><TrainingActions training={training} /></td></tr>)}</MpgTable>
    <details className="mpg-detail"><summary>Einweisung anlegen</summary><MpgForm title="Neue Einweisung" initial={deviceId ? { deviceId } : {}} fields={[
      { name: "modelId", label: "Modell", required: true, options: options(catalog.models) },
      { name: "deviceId", label: "Optionales Einzelgerät", options: options(devices) }, dateField("performedAt", "Datum", true),
      { name: "instructorId", label: "Einweisende Person", required: true, options: options(catalog.people.filter(p => p.active && p.instructorAuthorization)) },
      { name: "documentId", label: "Verwendete Gebrauchsanweisung", required: true, options: catalog.models.filter(m => m.instructionsDocumentId).map(m => ({ value: m.instructionsDocumentId!, label: `${m.manufacturer} · ${m.name}` })) }, textField("scope", "Geltungsbereich"),
      { ...textField("contents", "Inhalte"), type: "textarea" }, { name: "participantIds", label: "Teilnehmer", required: true, options: options(catalog.people.filter(p => p.active)), multiple: true }
    ]} onSubmit={body => action.mutateAsync({ path: "/trainings", body })} /></details>
  </section>;
}

function TrainingActions({ training }: { training: Training }) {
  const action = useMpgAction(); const [confirmation, setConfirmation] = useState(training.confirmations.find(c => !c.confirmedAt));
  const [signature, setSignature] = useState(""); const [text, setText] = useState("Ich bestätige die persönliche Teilnahme und Einweisung in den angegebenen Geltungsbereich.");
  if (training.finalizedAt) return <AnchorButton variant="ghost" href={`/api/mpg/exports/trainings/${training.id}.pdf`}>PDF</AnchorButton>;
  return <div className="mpg-confirm"><Field label="Nächste Bestätigung"><select value={confirmation?.id ?? ""} onChange={e => setConfirmation(training.confirmations.find(c => c.id === e.target.value))}><option value="">Bitte auswählen</option>{training.confirmations.filter(c => !c.confirmedAt).map(c => <option key={c.id} value={c.id}>{c.nameSnapshot}</option>)}</select></Field>
    {confirmation ? <><Field label="Bestätigungstext"><textarea value={text} onChange={e => setText(e.target.value)} /></Field><Signature onChange={setSignature} /><Button disabled={!signature} onClick={() => action.mutate({ path: `/trainings/${training.id}/confirm`, body: { version: training.version, personId: confirmation.personId, role: confirmation.role, confirmationText: text, signaturePngDataUrl: signature } })}>Bestätigung speichern</Button></> : null}
    {training.confirmations.every(c => c.confirmedAt) ? <Button onClick={() => action.mutate({ path: `/trainings/${training.id}/finalize`, body: { version: training.version } })}>Einweisung abschließen</Button> : null}</div>;
}
