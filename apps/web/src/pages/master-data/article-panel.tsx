import { useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { ListFilterBar } from "../../components/list-filter-bar";
import { PanelHeader } from "../../components/panel-header";
import { PageToolbar } from "../../components/page-layout";
import { SearchableSelect } from "../../components/searchable-select";
import type { Article, CreateArticleRequest, UpdateArticleRequest } from "../../lib/types";
import { InlineError } from "../../components/state-panels";
import { Button, Dialog, Field, Panel } from "../../components/ui";
import { ArticleListRow } from "./article-list-row";
import { centsInput, parseCents } from "../purchase-orders/format";
import type { ReorderDirection } from "./reorder";
import "./article-panel.css";

type ArticleDraft = {
  isOpen: boolean;
  editingId: string | null;
  name: string;
  unit: string;
  manufacturer: string;
  manufacturerPartNumber: string;
  category: string;
  barcode: string;
  articleUrl: string;
  defaultSupplierName: string;
  defaultGrossPrice: string;
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
  filters: {
    category: string;
    criticalDefault: boolean;
    medicalDevice: boolean;
    mtkRequired: boolean;
    q: string;
    stkRequired: boolean;
  };
  isSubmitting: boolean;
  onFilterChange: (patch: Partial<{
    category: string;
    criticalDefault: boolean;
    medicalDevice: boolean;
    mtkRequired: boolean;
    q: string;
    stkRequired: boolean;
  }>) => void;
  onResetFilters: () => void;
  onCreate: (body: CreateArticleRequest) => Promise<unknown>;
  onDelete: (id: string) => void;
  onMoveArticle: (id: string, direction: ReorderDirection) => Promise<unknown>;
  onSave: (id: string, body: UpdateArticleRequest) => Promise<unknown>;
  totalCount: number;
}) {
  const [draft, setDraft] = useState(emptyDraft());
  const canSubmit = Boolean(draft.name.trim() && draft.unit.trim() && intervalsValid(draft));
  const categories = [...new Set(props.articles.map((entry) => entry.category).filter((entry): entry is string => Boolean(entry)))].sort((left, right) => left.localeCompare(right, "de-DE"));

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
      articleUrl: article.articleUrl ?? "",
      defaultSupplierName: article.defaultSupplierName ?? "",
      defaultGrossPrice: centsInput(article.defaultGrossPriceCents),
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
      articleUrl: optionalText(draft.articleUrl),
      defaultSupplierName: optionalText(draft.defaultSupplierName),
      defaultGrossPriceCents: optionalCents(draft.defaultGrossPrice),
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
    <>
      <PageToolbar label="Artikel filtern"><ListFilterBar countLabel={`${props.articles.length}/${props.totalCount} sichtbar`} fieldsClassName="article-filter-grid" onReset={props.onResetFilters}>
        <Field label="Suche"><input onChange={(event) => props.onFilterChange({ q: event.target.value })} placeholder="Name, Hersteller oder Barcode" value={props.filters.q} /></Field>
        <Field label="Kategorie"><SearchableSelect emptyLabel="Alle Kategorien" onChange={(value) => props.onFilterChange({ category: value })} options={[{ label: "Alle Kategorien", value: "" }, ...categories.map((category) => ({ label: category, value: category }))]} value={props.filters.category} /></Field>
        <div aria-label="Artikelmerkmale" className="article-filter-checks">
          <label className="check-field check-field-compact"><input checked={props.filters.medicalDevice} onChange={(event) => props.onFilterChange({ medicalDevice: event.target.checked })} type="checkbox" /><span>MPDG</span></label>
          <label className="check-field check-field-compact"><input checked={props.filters.stkRequired} onChange={(event) => props.onFilterChange({ stkRequired: event.target.checked })} type="checkbox" /><span>STK</span></label>
          <label className="check-field check-field-compact"><input checked={props.filters.mtkRequired} onChange={(event) => props.onFilterChange({ mtkRequired: event.target.checked })} type="checkbox" /><span>MTK</span></label>
          <label className="check-field check-field-compact"><input checked={props.filters.criticalDefault} onChange={(event) => props.onFilterChange({ criticalDefault: event.target.checked })} type="checkbox" /><span>Kritisch</span></label>
        </div>
      </ListFilterBar></PageToolbar>
      <Panel>
        <PanelHeader className="article-panel-header" description={`${props.articles.length}/${props.totalCount} sichtbar`} title="Artikel" actions={<Button onClick={openForCreate} type="button"><Plus data-icon="inline-start" />Artikel hinzufügen</Button>} />
        <div className="article-table-header" aria-hidden="true">
          <span></span>
          <span>Hinweise</span>
          <span>Lagerhinweise</span>
          <span>Merkmale</span>
          <span></span>
        </div>
        {props.articles.length === 0 ? <div className="compact-list-empty">Noch keine Artikel angelegt.</div> : null}
        <div className="table article-table">
          {props.articles.map((article, index) => (
            <ArticleListRow
              article={article}
              canMoveDown={index < props.articles.length - 1}
              canMoveUp={index > 0}
              isSubmitting={props.isSubmitting}
              key={article.id}
              onDelete={() => confirmDelete(article)}
              onEdit={() => openForEdit(article)}
              onMove={(direction) => void props.onMoveArticle(article.id, direction)}
            />
          ))}
        </div>
      <Dialog actions={<><Button disabled={props.isSubmitting} onClick={() => setDraft(emptyDraft())} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button><Button disabled={!canSubmit || props.isSubmitting} onClick={() => void submit()} type="button">{draft.editingId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}{draft.editingId ? "Artikel speichern" : "Artikel anlegen"}</Button></>} onClose={() => setDraft(emptyDraft())} open={draft.isOpen} title={draft.editingId ? "Artikel bearbeiten" : "Artikel anlegen"}>
        <div className="form-grid form-grid-three">
          <Field label="Name"><input autoFocus onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} value={draft.name} /></Field>
          <Field label="Einheit"><input onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))} value={draft.unit} /></Field>
          <Field label="Kategorie"><input onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} value={draft.category} /></Field>
          <Field label="Hersteller"><input onChange={(event) => setDraft((current) => ({ ...current, manufacturer: event.target.value }))} value={draft.manufacturer} /></Field>
          <Field label="Hersteller-Art.-Nr."><input onChange={(event) => setDraft((current) => ({ ...current, manufacturerPartNumber: event.target.value }))} value={draft.manufacturerPartNumber} /></Field>
          <Field label="Barcode/DataMatrix"><input onChange={(event) => setDraft((current) => ({ ...current, barcode: event.target.value }))} value={draft.barcode} /></Field>
          <Field label="Artikel-Link"><input onChange={(event) => setDraft((current) => ({ ...current, articleUrl: event.target.value }))} placeholder="https://…" type="url" value={draft.articleUrl} /></Field>
          <Field label="Standard-Lieferant"><input onChange={(event) => setDraft((current) => ({ ...current, defaultSupplierName: event.target.value }))} value={draft.defaultSupplierName} /></Field>
          <Field label="Standardpreis brutto"><input inputMode="decimal" onChange={(event) => setDraft((current) => ({ ...current, defaultGrossPrice: event.target.value }))} placeholder="0,00" value={draft.defaultGrossPrice} /></Field>
          <Field label="Lagerhinweise"><input onChange={(event) => setDraft((current) => ({ ...current, storageNotes: event.target.value }))} value={draft.storageNotes} /></Field>
          <Field label="Hinweise"><textarea onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={1} value={draft.notes} /></Field>
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
    </>
  );
}

function emptyDraft(): ArticleDraft {
  return { isOpen: false, editingId: null, name: "", unit: "Stück", manufacturer: "", manufacturerPartNumber: "", category: "", barcode: "", articleUrl: "", defaultSupplierName: "", defaultGrossPrice: "", sterile: false, medicalDevice: false, stkRequired: false, stkIntervalMonths: "", mtkRequired: false, mtkIntervalMonths: "", storageNotes: "", notes: "", criticalDefault: false };
}

function optionalText(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function intervalValue(required: boolean, value: string) {
  if (!required) return undefined;
  return Number.parseInt(value, 10);
}

function optionalCents(value: string) {
  return value.trim() ? parseCents(value) : undefined;
}

function intervalsValid(draft: ArticleDraft) {
  return (!draft.stkRequired || Number.isInteger(Number(draft.stkIntervalMonths)) && Number(draft.stkIntervalMonths) > 0) &&
    (!draft.mtkRequired || Number.isInteger(Number(draft.mtkIntervalMonths)) && Number(draft.mtkIntervalMonths) > 0);
}
