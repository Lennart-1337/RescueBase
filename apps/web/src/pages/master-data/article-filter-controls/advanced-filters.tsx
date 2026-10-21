import { CheckboxField, Field } from "../../../components/ui";
import type { ArticleFilters } from "../types";
import { MultiFilter, type FilterOption } from "./multi-filter";
import { arrayValue, flagOptions, missingOptions } from "./options";
export function AdvancedFilters({ filters, onChange, units }: {
  filters: ArticleFilters; onChange: (patch: Partial<ArticleFilters>) => void; units: FilterOption[];
}) {
  return <details className="article-advanced-filters">
    <summary>Weitere Filter</summary>
    <div className="article-advanced-grid" aria-label="Weitere Artikelfilter">
      {flagOptions.map(({ key, label }) => <Field key={key} label={label}>
        <select aria-label={label} value={filters[key] === true ? "yes" : filters[key] === false ? "no" : ""}
          onChange={(event) => onChange({ [key]: event.target.value === "" ? "" : event.target.value === "yes" })}>
          <option value="">Alle</option><option value="yes">{key === "sterile" ? "Steril" : "Ja"}</option>
          <option value="no">{key === "sterile" ? "Nicht steril" : "Nein"}</option>
        </select>
      </Field>)}
      <MultiFilter label="Einheit" emptyLabel="Alle Einheiten" options={units} value={arrayValue(filters.unit)} onChange={(unit) => onChange({ unit })} />
      <MultiFilter label="Fehlende Angaben" emptyLabel="Keine Einschränkung" options={missingOptions} value={filters.missing ?? []} onChange={(missing) => onChange({ missing })} />
      <Field label="Preisbezug"><select aria-label="Preisbezug" value={filters.priceBasis || "unit"} onChange={(event) => onChange({ priceBasis: event.target.value as ArticleFilters["priceBasis"] })}>
        <option value="unit">Je Stück</option><option value="package">Je Verpackungseinheit</option>
      </select></Field>
      <NumericRange label="Standardpreis (€)" fromLabel="Preis ab (€)" toLabel="Preis bis (€)" min={filters.priceMin} max={filters.priceMax}
        onMin={(priceMin) => onChange({ priceMin })} onMax={(priceMax) => onChange({ priceMax })} />
      <NumericRange label="Einheiten pro Packung" fromLabel="Packungsgröße ab" toLabel="Packungsgröße bis" min={filters.packageMin} max={filters.packageMax} integer disabled={filters.packageMissing}
        onMin={(packageMin) => onChange({ packageMin })} onMax={(packageMax) => onChange({ packageMax })} />
      <CheckboxField compact label="Verpackungsgröße nicht hinterlegt" checked={filters.packageMissing ?? false}
        onChange={(event) => onChange({ packageMissing: event.target.checked, packageMin: "", packageMax: "" })} />
    </div>
    <p className="article-filter-hint">Fehlende Angaben: Mindestens eines der gewählten Felder fehlt. Stückpreise werden aus dem Standardpreis und der Verpackungsgröße berechnet. Ohne Verpackungsgröße gilt der Standardpreis je Stück; der Vergleich je Verpackungseinheit benötigt eine hinterlegte Größe.</p>
  </details>;
}
function NumericRange(props: {
  label: string; fromLabel: string; toLabel: string; min?: string; max?: string; integer?: boolean; disabled?: boolean;
  onMin: (value: string) => void; onMax: (value: string) => void;
}) {
  return <fieldset className="field article-filter-range"><legend>{props.label}</legend><div>
    <input aria-label={props.fromLabel} type={props.integer ? "number" : "text"} inputMode={props.integer ? "numeric" : "decimal"} min={props.integer ? "1" : undefined} step={props.integer ? "1" : undefined} disabled={props.disabled} value={props.min ?? ""} onChange={(event) => props.onMin(event.target.value)} />
    <span>bis</span>
    <input aria-label={props.toLabel} type={props.integer ? "number" : "text"} inputMode={props.integer ? "numeric" : "decimal"} min={props.integer ? "1" : undefined} step={props.integer ? "1" : undefined} disabled={props.disabled} value={props.max ?? ""} onChange={(event) => props.onMax(event.target.value)} />
  </div></fieldset>;
}
