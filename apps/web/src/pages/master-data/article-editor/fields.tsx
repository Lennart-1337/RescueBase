import type { Dispatch, SetStateAction } from "react";
import type { Supplier } from "../../../lib/types";
import type { ArticleDraft } from "./draft";
import { Field } from "../../../components/ui";
import { SearchableSelect } from "../../../components/searchable-select";
import { ArticleImport } from "./import";

const textFields = [
  ["name", "Name"],
  ["unit", "Einheit"],
  ["category", "Kategorie"],
  ["manufacturer", "Hersteller"],
  ["manufacturerPartNumber", "Hersteller-Art.-Nr."],
  ["supplierArticleNumber", "Lieferanten-Art.-Nr."],
  ["barcode", "Barcode/DataMatrix"],
] as const;

export function ArticleFields({
  draft,
  setDraft,
  suppliers,
}: {
  draft: ArticleDraft;
  setDraft: Dispatch<SetStateAction<ArticleDraft>>;
  suppliers: Supplier[];
}) {
  const update = (key: keyof ArticleDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  return (
    <div className="article-editor-fields">
      {textFields.map(([key, label]) => (
        <Field
          key={key}
          label={label}
          className={key === "name" ? "article-editor-field-name" : undefined}
        >
          <input
            autoFocus={key === "name"}
            value={draft[key]}
            onChange={(event) => update(key, event.target.value)}
          />
        </Field>
      ))}
      <Field label="Kurzbezeichnung (optional)">
        <input
          maxLength={191}
          value={draft.shortName}
          onChange={(event) => update("shortName", event.target.value)}
        />
        <small>Hauptname in Checklisten. Ohne Kurzbezeichnung wird der vollständige Name verwendet.</small>
      </Field>
      <Field label="Artikel-Link">
        <input
          type="url"
          value={draft.articleUrl}
          onChange={(event) => update("articleUrl", event.target.value)}
        />
      </Field>
      <ArticleImport
        key={`${draft.isOpen}-${draft.editingId}`}
        draft={draft}
        setDraft={setDraft}
        suppliers={suppliers}
      />
      <Field label="Standard-Lieferant">
        <SearchableSelect
          emptyLabel="Kein Standard-Lieferant"
          value={draft.defaultSupplierId}
          onChange={(value) => update("defaultSupplierId", value)}
          options={[
            { label: "Kein Standard-Lieferant", value: "" },
            ...suppliers.map((supplier) => ({
              label: supplier.name,
              value: supplier.id,
            })),
          ]}
        />
      </Field>
      <Field label="VE (Einheiten pro Packung)">
        <input
          inputMode="numeric"
          min="1"
          type="number"
          value={draft.unitsPerPackage}
          onChange={(event) => update("unitsPerPackage", event.target.value)}
        />
      </Field>
      <Field
        label={
          draft.unitsPerPackage
            ? "Standardpreis je VE brutto"
            : "Standardpreis je Stück brutto"
        }
      >
        <input
          inputMode="decimal"
          value={draft.defaultGrossPrice}
          onChange={(event) => update("defaultGrossPrice", event.target.value)}
        />
      </Field>
      <Field className="article-editor-field-storage" label="Lagerhinweise">
        <input
          value={draft.storageNotes}
          onChange={(event) => update("storageNotes", event.target.value)}
        />
      </Field>
      <Field className="article-editor-field-notes" label="Hinweise">
        <textarea
          rows={3}
          value={draft.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </Field>
    </div>
  );
}
