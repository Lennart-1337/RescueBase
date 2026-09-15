import { useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { Button } from "../../components/ui";
import { useMpgAction } from "./api";
import { MpgDataTable } from "./data-table";
import { Documents } from "./documents";
import { MpgFormDialog } from "./form-dialog";
import { dateField, textField } from "./shared";
import type { Model } from "./types";

const modelFields = [textField("name", "Modellbezeichnung"), textField("manufacturer", "Hersteller"), textField("manufacturerAddress", "Herstelleranschrift"), textField("productType", "Produktart")];
const requirementFields = [{ name: "kind", label: "Prüfart", required: true, options: ["STK", "MTK", "MAINTENANCE", "OTHER"].map(value => ({ value, label: ({ MAINTENANCE: "Wartung", OTHER: "Weitere Kontrolle" } as Record<string, string>)[value] ?? value })) }, textField("title", "Bezeichnung"), textField("source", "Beleg / Herstellerangabe"), { name: "mandatory", label: "Pflichtprüfung", type: "checkbox" as const }, { name: "intervalMonths", label: "Intervall in Monaten", type: "number" as const, min: 1 }, dateField("firstDueAt", "Erste Fälligkeit")];

export function Models({ models }: { models: Model[] }) {
  const action = useMpgAction(); const [createOpen, setCreateOpen] = useState(false); const [requirementOpen, setRequirementOpen] = useState(false); const [reviewOpen, setReviewOpen] = useState(false); const [selectedId, setSelectedId] = useState("");
  const selected = models.find(model => model.id === selectedId) ?? models[0] ?? null;
  const columns: DataTableColumn<Model>[] = [{ id: "model", label: "Modell", render: model => <><strong>{model.name}</strong><small>{model.manufacturer}</small></>, sortValue: model => model.name }, { id: "type", label: "Produktart", render: model => model.productType, sortValue: model => model.productType }, { id: "requirements", label: "Prüfanforderungen", render: model => model.requirements.length, sortValue: model => model.requirements.length, width: "160px" }, { id: "review", label: "Modellprüfung", render: model => <span className={`mpg-status mpg-status-${model.requirementsReviewedAt ? "ready" : "warning"}`}>{model.requirementsReviewedAt ? "Geprüft" : "Offen"}</span>, sortValue: model => model.requirementsReviewedAt ? 1 : 0, width: "140px" }];
  return <section className="mpg-section"><header className="mpg-section-header"><div><h2>Modelle und Prüfanforderungen</h2><p>{models.length} {models.length === 1 ? "Modell" : "Modelle"}</p></div><Button onClick={() => setCreateOpen(true)} type="button"><Plus data-icon="inline-start" />Modell anlegen</Button></header>
    <MpgDataTable columns={columns} emptyMessage="Noch keine Modelle angelegt." getRowId={model => model.id} onRowClick={model => setSelectedId(model.id)} rows={models} selectedRowId={selected?.id} />
    {selected ? <section className="mpg-detail-section"><header><div><h3>{selected.manufacturer} · {selected.name}</h3><p>{selected.productType} · {selected.manufacturerAddress}</p></div><div className="mpg-row-actions"><Button onClick={() => setRequirementOpen(true)} type="button" variant="secondary"><Plus data-icon="inline-start" />Prüfanforderung</Button><Button onClick={() => setReviewOpen(true)} type="button"><CheckCircle2 data-icon="inline-start" />Anforderungen prüfen</Button></div></header>
      <div className="mpg-requirement-list">{selected.requirements.length ? selected.requirements.map(requirement => <div key={requirement.id}><strong>{requirement.kind} · {requirement.title}</strong><span>{requirement.mandatory ? "Pflicht" : "Optional"} · {requirement.source}</span></div>) : <p>Für dieses Modell sind noch keine Prüfanforderungen dokumentiert.</p>}</div>
      <Documents owner={{ modelId: selected.id }} onUploaded={(id) => action.mutateAsync({ path: `/models/${selected.id}`, method: "PATCH", body: { version: selected.version, instructionsDocumentId: id } })} />
    </section> : null}
    <MpgFormDialog fields={modelFields} intent="create" onClose={() => setCreateOpen(false)} onSubmit={body => action.mutateAsync({ path: "/models", body })} open={createOpen} submitLabel="Modell anlegen" title="Modell anlegen" />
    {selected ? <><MpgFormDialog fields={requirementFields} initial={{ mandatory: true }} intent="create" onClose={() => setRequirementOpen(false)} onSubmit={body => action.mutateAsync({ path: `/models/${selected.id}/requirements`, body })} open={requirementOpen} size="wide" submitLabel="Prüfanforderung ergänzen" title="Prüfanforderung ergänzen" /><MpgFormDialog fields={[textField("source", "Prüfgrundlage und Begründung (auch bei keiner Prüfpflicht)")]} onClose={() => setReviewOpen(false)} onSubmit={body => action.mutateAsync({ path: `/models/${selected.id}/review`, body: { ...body, version: selected.version } })} open={reviewOpen} submitLabel="Modellprüfung dokumentieren" title="Anforderungen verbindlich prüfen" /></> : null}
  </section>;
}
