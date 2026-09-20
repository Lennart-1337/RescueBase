import { useState } from "react";
import { Plus } from "lucide-react";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { Button } from "../../components/ui";
import { useMpgAction } from "./api";
import { MpgDataTable } from "./data-table";
import { MpgFormDialog } from "./form-dialog";
import { ModelWorkspace } from "./model-workspace";
import { textField } from "./shared";
import type { Model } from "./types";

const modelFields = [textField("name", "Modellbezeichnung"), textField("manufacturer", "Hersteller"), textField("manufacturerAddress", "Herstelleranschrift"), textField("productType", "Produktart")];

export function Models({ models }: { models: Model[] }) {
  const action = useMpgAction();
  const [createOpen, setCreateOpen] = useState(false), [editOpen, setEditOpen] = useState(false), [requirementOpen, setRequirementOpen] = useState(false), [reviewOpen, setReviewOpen] = useState(false), [selectedId, setSelectedId] = useState("");
  const selected = models.find(model => model.id === selectedId) ?? null;
  const columns: DataTableColumn<Model>[] = [
    { id: "model", label: "Modell", render: model => <><strong>{model.name}</strong><small>{model.manufacturer}</small></>, sortValue: model => model.name },
    { id: "type", label: "Produktart", render: model => model.productType, sortValue: model => model.productType },
    { id: "requirements", label: "Prüfanforderungen", render: model => model.requirements.length, sortValue: model => model.requirements.length, width: "160px" },
    { id: "review", label: "Modellprüfung", render: model => <span className={`mpg-status mpg-status-${model.requirementsReviewedAt ? "ready" : "warning"}`}>{model.requirementsReviewedAt ? "Geprüft" : "Offen"}</span>, sortValue: model => model.requirementsReviewedAt ? 1 : 0, width: "140px" }
  ];
  return <section className="mpg-section"><header className="mpg-section-header"><div><h2>Modelle und Prüfanforderungen</h2><p>{models.length} {models.length === 1 ? "Modell" : "Modelle"}</p></div><Button onClick={() => setCreateOpen(true)} type="button"><Plus data-icon="inline-start" />Modell anlegen</Button></header>
    <MpgDataTable columns={columns} emptyMessage="Noch keine Modelle angelegt." getRowId={model => model.id} onRowClick={model => setSelectedId(model.id)} rows={models} selectedRowId={selected?.id} />
    {selected ? <ModelWorkspace model={selected} onAddRequirement={() => setRequirementOpen(true)} onEdit={() => setEditOpen(true)} onInstructionsUploaded={(id) => action.mutateAsync({ path: `/models/${selected.id}`, method: "PATCH", body: { version: selected.version, instructionsDocumentId: id } })} onReview={() => setReviewOpen(true)} /> : <p className="mpg-selection-hint">Modell auswählen, um Stammdaten, Prüfanforderungen und Dokumente zu bearbeiten.</p>}
    <MpgFormDialog fields={modelFields} intent="create" onClose={() => setCreateOpen(false)} onSubmit={body => action.mutateAsync({ path: "/models", body })} open={createOpen} submitLabel="Modell anlegen" title="Modell anlegen" />
    {selected ? <ModelDialogs action={action.mutateAsync} editOpen={editOpen} model={selected} onCloseEdit={() => setEditOpen(false)} onCloseRequirement={() => setRequirementOpen(false)} onCloseReview={() => setReviewOpen(false)} requirementOpen={requirementOpen} reviewOpen={reviewOpen} /> : null}
  </section>;
}

function ModelDialogs(props: { action: ReturnType<typeof useMpgAction>["mutateAsync"]; editOpen: boolean; model: Model; onCloseEdit: () => void; onCloseRequirement: () => void; onCloseReview: () => void; requirementOpen: boolean; reviewOpen: boolean }) {
  const requirementFields = [{ name: "kind", label: "Prüfart", required: true, options: ["STK", "MTK", "MAINTENANCE", "OTHER"].map(value => ({ value, label: ({ MAINTENANCE: "Wartung", OTHER: "Weitere Kontrolle" } as Record<string, string>)[value] ?? value })) }, textField("title", "Bezeichnung"), { ...textField("justification", "Begründung"), type: "textarea" as const }, textField("source", "Beleg / Herstellerangabe"), { name: "mandatory", label: "Pflichtprüfung", type: "checkbox" as const }, { name: "intervalMonths", label: "Intervall in Monaten", type: "number" as const, min: 1 }, { name: "firstDueAt", label: "Erste Fälligkeit", type: "date" as const }];
  return <><MpgFormDialog fields={modelFields} initial={{ name: props.model.name, manufacturer: props.model.manufacturer, manufacturerAddress: props.model.manufacturerAddress, productType: props.model.productType }} onClose={props.onCloseEdit} onSubmit={body => props.action({ path: `/models/${props.model.id}`, method: "PATCH", body: { ...body, version: props.model.version } })} open={props.editOpen} submitLabel="Änderungen speichern" title="Modell bearbeiten" />
    <MpgFormDialog fields={requirementFields} initial={{ mandatory: true }} intent="create" onClose={props.onCloseRequirement} onSubmit={body => props.action({ path: `/models/${props.model.id}/requirements`, body })} open={props.requirementOpen} size="wide" submitLabel="Prüfanforderung ergänzen" title="Prüfanforderung ergänzen" />
    <MpgFormDialog fields={[textField("source", "Prüfgrundlage und Begründung")]} onClose={props.onCloseReview} onSubmit={body => props.action({ path: `/models/${props.model.id}/review`, body: { ...body, version: props.model.version } })} open={props.reviewOpen} submitLabel="Modellprüfung dokumentieren" title="Anforderungen verbindlich prüfen" />
  </>;
}
