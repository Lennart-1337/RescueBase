import { X } from "lucide-react";
import type { ArticleFilters } from "../types";
import type { articleOptions } from "./options";
import { arrayValue, flagOptions } from "./options";
export function ActiveFilters({ filters, options, onChange }: {
  filters: ArticleFilters; options: ReturnType<typeof articleOptions>; onChange: (patch: Partial<ArticleFilters>) => void;
}) {
  const chips: { id: string; label: string; clear: () => void }[] = [];
  const names = { category: "Kategorie", manufacturer: "Hersteller", supplier: "Standard-Lieferant", unit: "Einheit", missing: "Fehlt" };
  for (const key of ["category", "manufacturer", "supplier", "unit", "missing"] as const) {
    const values = arrayValue(filters[key]);
    for (const value of values) chips.push({ id: `${key}-${value}`,
      label: `${names[key]}: ${options[key].find((option) => option.value === value)?.label ?? value}`,
      clear: () => onChange({ [key]: values.filter((entry) => entry !== value) }),
    });
  }
  if (filters.q) chips.push({ id: "q", label: `Suche: ${filters.q}`, clear: () => onChange({ q: "" }) });
  for (const { key, label } of flagOptions) {
    const value = filters[key];
    if (typeof value === "boolean") chips.push({ id: key, label: `${label}: ${key === "sterile" ? value ? "Steril" : "Nicht steril" : value ? "Ja" : "Nein"}`, clear: () => onChange({ [key]: "" }) });
  }
  const rangeLabels = { priceMin: "Preis ab", priceMax: "Preis bis", packageMin: "Packungsgröße ab", packageMax: "Packungsgröße bis" };
  for (const key of ["priceMin", "priceMax", "packageMin", "packageMax"] as const) {
    if (filters[key]) chips.push({ id: key, label: `${rangeLabels[key]}: ${filters[key]}${key.startsWith("price") ? " €" : ""}`, clear: () => onChange({ [key]: "" }) });
  }
  if (filters.priceBasis) chips.push({ id: "priceBasis", label: `Preisbezug: ${filters.priceBasis === "package" ? "Je Verpackungseinheit" : "Je Stück"}`, clear: () => onChange({ priceBasis: "" }) });
  if (filters.packageMissing) chips.push({ id: "packageMissing", label: "Verpackungsgröße: Nicht hinterlegt", clear: () => onChange({ packageMissing: false }) });
  return chips.length ? <div aria-label="Aktive Filter" className="article-active-filters">
    {chips.map((chip) => <button key={chip.id} type="button" onClick={chip.clear} aria-label={`${chip.label} entfernen`}>
      {chip.label}<X size={13} aria-hidden="true" />
    </button>)}
  </div> : null;
}
