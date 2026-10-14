import { ArticleFields } from "./article-editor/fields";
import { ArticleFlags } from "./article-editor/flags";
import {
  emptyDraft,
  intervalsValid,
  unitsPerPackageValid,
  optionalText,
  optionalPositiveInteger,
  optionalCents,
  intervalValue,
} from "./article-editor/draft";
import { useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { ListFilterBar } from "../../components/list-filter-bar";
import { PanelHeader } from "../../components/panel-header";
import { PageToolbar } from "../../components/page-layout";
import { SearchableSelect } from "../../components/searchable-select";
import type {
  Article,
  CreateArticleRequest,
  Supplier,
  UpdateArticleRequest,
} from "../../lib/types";
import { InlineError } from "../../components/state-panels";
import {
  Button,
  CheckboxField,
  Dialog,
  Field,
  Panel,
} from "../../components/ui";
import { ArticleListRow } from "./article-list-row";
import { centsInput } from "../purchase-orders/format";
import type { ReorderDirection } from "./reorder";
import "./article-panel.css";

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
  onFilterChange: (
    patch: Partial<{
      category: string;
      criticalDefault: boolean;
      medicalDevice: boolean;
      mtkRequired: boolean;
      q: string;
      stkRequired: boolean;
    }>,
  ) => void;
  onResetFilters: () => void;
  onCreate: (body: CreateArticleRequest) => Promise<unknown>;
  onDelete: (id: string) => void;
  onMoveArticle: (id: string, direction: ReorderDirection) => Promise<unknown>;
  onSave: (id: string, body: UpdateArticleRequest) => Promise<unknown>;
  suppliers: Supplier[];
  totalCount: number;
}) {
  const [draft, setDraft] = useState(emptyDraft());
  const [expandedReorderId, setExpandedReorderId] = useState<string | null>(
    null,
  );
  const canSubmit = Boolean(
    draft.name.trim() &&
    draft.unit.trim() &&
    intervalsValid(draft) &&
    unitsPerPackageValid(draft.unitsPerPackage),
  );
  const categories = [
    ...new Set(
      props.articles
        .map((entry) => entry.category)
        .filter((entry): entry is string => Boolean(entry)),
    ),
  ].sort((left, right) => left.localeCompare(right, "de-DE"));

  function openForCreate() {
    setDraft({ ...emptyDraft(), isOpen: true });
  }
  function openForEdit(article: Article) {
    setDraft({
      isOpen: true,
      editingId: article.id,
      name: article.name,
      unit: article.unit,
      manufacturer: article.manufacturer ?? "",
      manufacturerPartNumber: article.manufacturerPartNumber ?? "",
      supplierArticleNumber: article.supplierArticleNumber ?? "",
      category: article.category ?? "",
      barcode: article.barcode ?? "",
      articleUrl: article.articleUrl ?? "",
      defaultSupplierId: article.defaultSupplierId ?? "",
      unitsPerPackage: article.unitsPerPackage?.toString() ?? "",
      defaultGrossPrice: centsInput(article.defaultGrossPriceCents),
      sterile: article.sterile,
      medicalDevice: article.medicalDevice ?? false,
      stkRequired: article.stkRequired ?? false,
      stkIntervalMonths: article.stkIntervalMonths?.toString() ?? "",
      mtkRequired: article.mtkRequired ?? false,
      mtkIntervalMonths: article.mtkIntervalMonths?.toString() ?? "",
      storageNotes: article.storageNotes ?? "",
      notes: article.notes ?? "",
      criticalDefault: article.criticalDefault,
    });
  }

  async function submit() {
    if (!canSubmit) return;
    const body = {
      name: draft.name,
      unit: draft.unit,
      manufacturer: optionalText(draft.manufacturer),
      manufacturerPartNumber: optionalText(draft.manufacturerPartNumber),
      supplierArticleNumber: optionalText(draft.supplierArticleNumber),
      category: optionalText(draft.category),
      barcode: optionalText(draft.barcode),
      articleUrl: optionalText(draft.articleUrl),
      defaultSupplierId: optionalText(draft.defaultSupplierId),
      unitsPerPackage: optionalPositiveInteger(draft.unitsPerPackage),
      defaultGrossPriceCents: optionalCents(draft.defaultGrossPrice),
      sterile: draft.sterile,
      medicalDevice: draft.medicalDevice,
      stkRequired: draft.stkRequired,
      stkIntervalMonths: intervalValue(
        draft.stkRequired,
        draft.stkIntervalMonths,
      ),
      mtkRequired: draft.mtkRequired,
      mtkIntervalMonths: intervalValue(
        draft.mtkRequired,
        draft.mtkIntervalMonths,
      ),
      storageNotes: optionalText(draft.storageNotes),
      notes: optionalText(draft.notes),
      criticalDefault: draft.criticalDefault,
    };
    const succeeded = await (
      draft.editingId
        ? props.onSave(draft.editingId, body)
        : props.onCreate(body)
    )
      .then(() => true)
      .catch(() => false);
    if (succeeded) setDraft(emptyDraft());
  }

  function confirmDelete(article: Article) {
    if (window.confirm(`Artikel "${article.name}" wirklich löschen?`)) {
      props.onDelete(article.id);
    }
  }

  async function moveArticle(articleId: string, direction: ReorderDirection) {
    await props.onMoveArticle(articleId, direction);
  }

  return (
    <>
      <PageToolbar label="Artikel filtern">
        <ListFilterBar
          countLabel={`${props.articles.length}/${props.totalCount} sichtbar`}
          fieldsClassName="article-filter-grid"
          onReset={props.onResetFilters}
        >
          <Field label="Suche">
            <input
              onChange={(event) =>
                props.onFilterChange({ q: event.target.value })
              }
              placeholder="Name, Hersteller oder Barcode"
              value={props.filters.q}
            />
          </Field>
          <Field label="Kategorie">
            <SearchableSelect
              emptyLabel="Alle Kategorien"
              onChange={(value) => props.onFilterChange({ category: value })}
              options={[
                { label: "Alle Kategorien", value: "" },
                ...categories.map((category) => ({
                  label: category,
                  value: category,
                })),
              ]}
              value={props.filters.category}
            />
          </Field>
          <div aria-label="Artikelmerkmale" className="article-filter-checks">
            <CheckboxField
              compact
              checked={props.filters.medicalDevice}
              label="MPDG"
              onChange={(event) =>
                props.onFilterChange({ medicalDevice: event.target.checked })
              }
            />
            <CheckboxField
              compact
              checked={props.filters.stkRequired}
              label="STK"
              onChange={(event) =>
                props.onFilterChange({ stkRequired: event.target.checked })
              }
            />
            <CheckboxField
              compact
              checked={props.filters.mtkRequired}
              label="MTK"
              onChange={(event) =>
                props.onFilterChange({ mtkRequired: event.target.checked })
              }
            />
            <CheckboxField
              compact
              checked={props.filters.criticalDefault}
              label="Kritisch"
              onChange={(event) =>
                props.onFilterChange({ criticalDefault: event.target.checked })
              }
            />
          </div>
        </ListFilterBar>
      </PageToolbar>
      <Panel>
        <PanelHeader
          className="article-panel-header"
          description={`${props.articles.length}/${props.totalCount} sichtbar`}
          title="Artikel"
          actions={
            <Button onClick={openForCreate} type="button">
              <Plus data-icon="inline-start" />
              Artikel hinzufügen
            </Button>
          }
        />
        <div className="article-table-header" aria-hidden="true">
          <span></span>
          <span>Hinweise</span>
          <span>Lagerhinweise</span>
          <span>Merkmale</span>
          <span></span>
        </div>
        {props.articles.length === 0 ? (
          <div className="compact-list-empty">Noch keine Artikel angelegt.</div>
        ) : null}
        <div className="table article-table">
          {props.articles.map((article, index) => (
            <ArticleListRow
              article={article}
              canMoveDown={index < props.articles.length - 1}
              canMoveUp={index > 0}
              isReorderExpanded={expandedReorderId === article.id}
              isSubmitting={props.isSubmitting}
              key={article.id}
              onDelete={() => confirmDelete(article)}
              onEdit={() => openForEdit(article)}
              onMove={(direction) => void moveArticle(article.id, direction)}
              onToggleReorder={() =>
                setExpandedReorderId((current) =>
                  current === article.id ? null : article.id,
                )
              }
            />
          ))}
        </div>
        <Dialog
          actions={
            <>
              <Button
                disabled={props.isSubmitting}
                onClick={() => setDraft(emptyDraft())}
                type="button"
                variant="ghost"
              >
                <X data-icon="inline-start" />
                Abbrechen
              </Button>
              <Button
                disabled={!canSubmit}
                loading={props.isSubmitting}
                onClick={() => void submit()}
                type="button"
              >
                {draft.editingId ? (
                  <Save data-icon="inline-start" />
                ) : (
                  <Plus data-icon="inline-start" />
                )}
                {draft.editingId ? "Artikel speichern" : "Artikel anlegen"}
              </Button>
            </>
          }
          onClose={() => setDraft(emptyDraft())}
          open={draft.isOpen}
          size="wide"
          title={draft.editingId ? "Artikel bearbeiten" : "Artikel anlegen"}
        >
          <div className="article-editor-layout">
            <ArticleFields
              draft={draft}
              setDraft={setDraft}
              suppliers={props.suppliers}
            />
            <ArticleFlags draft={draft} setDraft={setDraft} />
          </div>
          {props.error ? <InlineError error={props.error} /> : null}
        </Dialog>
      </Panel>
    </>
  );
}
