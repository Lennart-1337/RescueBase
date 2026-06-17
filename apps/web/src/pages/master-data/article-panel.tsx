import { useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { Article, CreateArticleRequest, UpdateArticleRequest } from "../../lib/types";
import { InlineError } from "../../components/state-panels";
import { Badge, Button, Dialog, Field, Panel } from "../../components/ui";

type ArticleDraft = {
  isOpen: boolean;
  editingId: string | null;
  name: string;
  unit: string;
  manufacturer: string;
  manufacturerPartNumber: string;
  category: string;
  barcode: string;
  sterile: boolean;
  medicalDevice: boolean;
  stkRequired: boolean;
  stkIntervalMonths: string;
  mtkRequired: boolean;
  mtkIntervalMonths: string;
  storageNotes: string;
  notes: string;
  criticalDefault: boolean;
};

export function ArticlePanel(props: {
  articles: Article[];
  error: Error | null;
  isSubmitting: boolean;
  onCreate: (body: CreateArticleRequest) => Promise<unknown>;
  onDelete: (id: string) => void;
  onSave: (id: string, body: UpdateArticleRequest) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState(emptyDraft());
  const canSubmit = Boolean(draft.name.trim() && draft.unit.trim() && intervalsValid(draft));

  function openForCreate() { setDraft({ ...emptyDraft(), isOpen: true }); }
  function openForEdit(article: Article) {
    setDraft({
      isOpen: true,
      editingId: article.id,
      name: article.name,
      unit: article.unit,
      manufacturer: article.manufacturer ?? "",
      manufacturerPartNumber: article.manufacturerPartNumber ?? "",
      category: article.category ?? "",
      barcode: article.barcode ?? "",
      sterile: article.sterile,
      medicalDevice: article.medicalDevice ?? false,
      stkRequired: article.stkRequired ?? false,
      stkIntervalMonths: article.stkIntervalMonths?.toString() ?? "",
      mtkRequired: article.mtkRequired ?? false,
      mtkIntervalMonths: article.mtkIntervalMonths?.toString() ?? "",
      storageNotes: article.storageNotes ?? "",
      notes: article.notes ?? "",
      criticalDefault: article.criticalDefault
    });
  }

  async function submit() {
    if (!canSubmit) return;
    const body = {
      name: draft.name,
      unit: draft.unit,
      manufacturer: optionalText(draft.manufacturer),
      manufacturerPartNumber: optionalText(draft.manufacturerPartNumber),
      category: optionalText(draft.category),
      barcode: optionalText(draft.barcode),
      sterile: draft.sterile,
      medicalDevice: draft.medicalDevice,
      stkRequired: draft.stkRequired,
      stkIntervalMonths: intervalValue(draft.stkRequired, draft.stkIntervalMonths),
      mtkRequired: draft.mtkRequired,
      mtkIntervalMonths: intervalValue(draft.mtkRequired, draft.mtkIntervalMonths),
      storageNotes: optionalText(draft.storageNotes),
      notes: optionalText(draft.notes),
      criticalDefault: draft.criticalDefault
    };
    const succeeded = await (draft.editingId ? props.onSave(draft.editingId, body) : props.onCreate(body)).then(() => true).catch(() => false);
    if (succeeded) setDraft(emptyDraft());
  }

  function confirmDelete(article: Article) {
    if (window.confirm(`Artikel "${article.name}" wirklich löschen?`)) {
      props.onDelete(article.id);
    }
  }

  return (
    <Panel>
      <div className="panel-header"><div><h2>Artikel</h2><p>Materialstamm mit Herstellerdaten, MPDG, STK und MTK.</p></div><Button onClick={openForCreate} type="button"><Plus data-icon="inline-start" />Artikel hinzufügen</Button></div>
      {props.articles.length === 0 ? <div className="compact-list-empty">Noch keine Artikel angelegt.</div> : null}
      <div className="compact-list">{props.articles.map((article) => <div className="compact-list-row compact-list-row-actions" key={article.id}><span><strong>{article.name}</strong><small>{[article.unit, article.manufacturer, article.category].filter(Boolean).join(" · ")}</small></span><div className="row-actions">{article.medicalDevice ? <Badge tone="info">MPDG</Badge> : null}{article.stkRequired ? <Badge tone="info">STK {article.stkIntervalMonths ?? "?"}M</Badge> : null}{article.mtkRequired ? <Badge tone="info">MTK {article.mtkIntervalMonths ?? "?"}M</Badge> : null}{article.sterile ? <Badge tone="info">steril</Badge> : null}{article.criticalDefault ? <Badge tone="info">kritisch</Badge> : null}<Button onClick={() => openForEdit(article)} type="button" variant="ghost"><Pencil data-icon="inline-start" />Bearbeiten</Button><Button aria-label={`${article.name} löschen`} disabled={props.isSubmitting} onClick={() => confirmDelete(article)} type="button" variant="danger"><Trash2 data-icon="inline-start" />Löschen</Button></div></div>)}</div>
      <Dialog actions={<><Button disabled={props.isSubmitting} onClick={() => setDraft(emptyDraft())} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button><Button disabled={!canSubmit || props.isSubmitting} onClick={() => void submit()} type="button">{draft.editingId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}{draft.editingId ? "Artikel speichern" : "Artikel anlegen"}</Button></>} description="Pflegen Sie Materialstammdaten für Medizinprodukte und Verbrauchsmaterial." onClose={() => setDraft(emptyDraft())} open={draft.isOpen} title={draft.editingId ? "Artikel bearbeiten" : "Artikel anlegen"}>
        <div className="form-grid form-grid-three">
          <Field label="Name"><input onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} value={draft.name} /></Field>
          <Field label="Einheit"><input onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))} value={draft.unit} /></Field>
          <Field label="Kategorie"><input onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} value={draft.category} /></Field>
          <Field label="Hersteller"><input onChange={(event) => setDraft((current) => ({ ...current, manufacturer: event.target.value }))} value={draft.manufacturer} /></Field>
          <Field label="Hersteller-Art.-Nr."><input onChange={(event) => setDraft((current) => ({ ...current, manufacturerPartNumber: event.target.value }))} value={draft.manufacturerPartNumber} /></Field>
          <Field label="Barcode/DataMatrix"><input onChange={(event) => setDraft((current) => ({ ...current, barcode: event.target.value }))} value={draft.barcode} /></Field>
          <Field label="Lagerhinweise"><input onChange={(event) => setDraft((current) => ({ ...current, storageNotes: event.target.value }))} value={draft.storageNotes} /></Field>
          <Field label="Hinweise"><textarea onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={3} value={draft.notes} /></Field>
          <div className="form-grid">
            <label className="check-field"><input checked={draft.sterile} onChange={(event) => setDraft((current) => ({ ...current, sterile: event.target.checked }))} type="checkbox" /><span>Steril</span></label>
            <label className="check-field"><input checked={draft.medicalDevice} onChange={(event) => setDraft((current) => ({ ...current, medicalDevice: event.target.checked }))} type="checkbox" /><span>Medizinprodukt (MPDG)</span></label>
            <label className="check-field"><input checked={draft.stkRequired} onChange={(event) => setDraft((current) => ({ ...current, stkRequired: event.target.checked, stkIntervalMonths: event.target.checked ? current.stkIntervalMonths || "12" : "" }))} type="checkbox" /><span>STK erforderlich</span></label>
            {draft.stkRequired ? <Field label="STK-Intervall (Monate)"><input inputMode="numeric" min="1" onChange={(event) => setDraft((current) => ({ ...current, stkIntervalMonths: event.target.value }))} type="number" value={draft.stkIntervalMonths} /></Field> : null}
            <label className="check-field"><input checked={draft.mtkRequired} onChange={(event) => setDraft((current) => ({ ...current, mtkRequired: event.target.checked, mtkIntervalMonths: event.target.checked ? current.mtkIntervalMonths || "12" : "" }))} type="checkbox" /><span>MTK erforderlich</span></label>
            {draft.mtkRequired ? <Field label="MTK-Intervall (Monate)"><input inputMode="numeric" min="1" onChange={(event) => setDraft((current) => ({ ...current, mtkIntervalMonths: event.target.value }))} type="number" value={draft.mtkIntervalMonths} /></Field> : null}
            <label className="check-field"><input checked={draft.criticalDefault} onChange={(event) => setDraft((current) => ({ ...current, criticalDefault: event.target.checked }))} type="checkbox" /><span>Kritisch als Standard</span></label>
          </div>
        </div>
        {props.error ? <InlineError error={props.error} /> : null}
      </Dialog>
    </Panel>
  );
}

function emptyDraft(): ArticleDraft {
  return { isOpen: false, editingId: null, name: "", unit: "Stück", manufacturer: "", manufacturerPartNumber: "", category: "", barcode: "", sterile: false, medicalDevice: false, stkRequired: false, stkIntervalMonths: "", mtkRequired: false, mtkIntervalMonths: "", storageNotes: "", notes: "", criticalDefault: false };
}

function optionalText(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function intervalValue(required: boolean, value: string) {
  if (!required) return undefined;
  return Number.parseInt(value, 10);
}

function intervalsValid(draft: ArticleDraft) {
  return (!draft.stkRequired || Number.isInteger(Number(draft.stkIntervalMonths)) && Number(draft.stkIntervalMonths) > 0) &&
    (!draft.mtkRequired || Number.isInteger(Number(draft.mtkIntervalMonths)) && Number(draft.mtkIntervalMonths) > 0);
}
