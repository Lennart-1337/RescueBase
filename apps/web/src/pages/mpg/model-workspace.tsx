import { useState } from "react";
import { CheckCircle2, Pencil, Plus } from "lucide-react";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { Button, Tabs } from "../../components/ui";
import { MpgDataTable } from "./data-table";
import { Documents } from "./documents";
import type { Model, Requirement } from "./types";

type ModelWorkspaceProps = { model: Model; onAddRequirement: () => void; onEdit: () => void; onInstructionsUploaded: (id: string) => Promise<unknown>; onReview: () => void };

export function ModelWorkspace({ model, onAddRequirement, onEdit, onInstructionsUploaded, onReview }: ModelWorkspaceProps) {
  const [tab, setTab] = useState("overview");
  const requirementColumns: DataTableColumn<Requirement>[] = [
    { id: "requirement", label: "Prüfanforderung", render: requirement => <><strong>{requirement.kind} · {requirement.title}</strong><small>{requirement.justification}</small></>, sortValue: requirement => requirement.title },
    { id: "source", label: "Quelle", render: requirement => requirement.source, sortValue: requirement => requirement.source },
    { id: "cycle", label: "Fälligkeit", render: requirement => requirement.intervalMonths ? `Alle ${requirement.intervalMonths} Monate` : requirement.firstDueAt ?? "Offen", sortValue: requirement => requirement.intervalMonths ?? requirement.firstDueAt ?? "", width: "190px" },
    { id: "mandatory", label: "Art", render: requirement => requirement.mandatory ? "Pflicht" : "Optional", sortValue: requirement => requirement.mandatory ? 1 : 0, width: "110px" }
  ];
  return <section aria-label="Modellarbeitsbereich" className="mpg-model-workspace">
    <header className="mpg-model-workspace-header"><div><h3>{model.manufacturer} · {model.name}</h3><p>{model.productType}</p></div><Button onClick={onEdit} type="button" variant="secondary"><Pencil data-icon="inline-start" />Stammdaten bearbeiten</Button></header>
    <Tabs label="Bereiche des Modells" value={tab} onChange={setTab} items={[{ value: "overview", label: "Übersicht" }, { value: "requirements", label: "Prüfanforderungen" }, { value: "documents", label: "Dokumente" }]} />
    {tab === "overview" ? <Overview model={model} onReview={onReview} /> : null}
    {tab === "requirements" ? <section className="mpg-model-pane"><header><div><h4>Prüfanforderungen</h4><p>Gemeinsame Anforderungen für alle Geräte dieses Modells.</p></div><Button onClick={onAddRequirement} type="button"><Plus data-icon="inline-start" />Prüfanforderung hinzufügen</Button></header><MpgDataTable columns={requirementColumns} emptyMessage="Für dieses Modell sind noch keine Prüfanforderungen dokumentiert." getRowId={requirement => requirement.id} rows={model.requirements} /></section> : null}
    {tab === "documents" ? <section className="mpg-model-pane"><Documents owner={{ modelId: model.id }} onUploaded={onInstructionsUploaded} /></section> : null}
  </section>;
}

function Overview({ model, onReview }: { model: Model; onReview: () => void }) {
  return <section className="mpg-model-pane mpg-model-summary"><dl><div><dt>Hersteller</dt><dd>{model.manufacturer}</dd></div><div><dt>Produktart</dt><dd>{model.productType}</dd></div><div><dt>Herstelleranschrift</dt><dd>{model.manufacturerAddress}</dd></div><div><dt>Gebrauchsanweisung</dt><dd>{model.instructionsDocumentId ? "Hinterlegt" : "Offen"}</dd></div><div><dt>Modellprüfung</dt><dd>{model.requirementsReviewedAt ? "Geprüft" : "Offen"}</dd></div></dl><div className="mpg-model-review"><div><strong>Prüfgrundlage verbindlich prüfen</strong><p>Die Modellprüfung wird erst dokumentiert, wenn Gebrauchsanweisung und begründete Prüfanforderungen vollständig hinterlegt sind.</p></div><Button onClick={onReview} type="button"><CheckCircle2 data-icon="inline-start" />Anforderungen prüfen</Button></div></section>;
}
