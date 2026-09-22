import { ListFilterBar } from "../../components/list-filter-bar";
import { SearchableSelect } from "../../components/searchable-select";
import { Field } from "../../components/ui";
import type { Catalog } from "./devices";
import { statusLabel } from "./types";

export type DeviceFilters = { search: string; location: string; kit: string; type: string; status: string; due: string };
const statusOptions = ["DRAFT", "BLOCKED", "RELEASED", "RETIRED"].map(value => ({ value, label: statusLabel(value) }));
const dueOptions = [{ value: "OVERDUE", label: "Überfällig" }, { value: "SOON", label: "In 30 Tagen" }, { value: "MISSING", label: "Fälligkeit fehlt" }];
export const emptyDeviceFilters: DeviceFilters = { search: "", location: "", kit: "", type: "", status: "", due: "" };

export function DeviceFilterToolbar({ catalog, count, filters, onChange, onReset, total }: { catalog: Catalog; count: number; filters: DeviceFilters; onChange: (patch: Partial<DeviceFilters>) => void; onReset: () => void; total: number }) {
  const select = (label: string, emptyLabel: string, value: string, entries: { label: string; value: string }[], change: (value: string) => void) =>
    <Field key={label} label={label}><SearchableSelect emptyLabel={emptyLabel} onChange={change} options={[{ value: "", label: emptyLabel }, ...entries]} value={value} /></Field>;
  return <ListFilterBar countLabel={`${count}/${total} sichtbar`} fieldsClassName="mpg-filter-grid" onReset={onReset}>
    <Field label="Suche"><input onChange={event => onChange({ search: event.target.value })} placeholder="Name, Inventar- oder Seriennummer" type="search" value={filters.search} /></Field>
    {select("Standort", "Alle Standorte", filters.location, catalog.locations.map(item => ({ value: item.id, label: item.name })), location => onChange({ location }))}
    {select("Rucksack", "Alle Rucksäcke", filters.kit, catalog.kits.map(item => ({ value: item.id, label: item.name })), kit => onChange({ kit }))}
    {select("Gerätetyp", "Alle Gerätetypen", filters.type, [...new Set(catalog.models.map(model => model.productType))].map(value => ({ value, label: value })), type => onChange({ type }))}
    {select("Status", "Alle Status", filters.status, statusOptions, status => onChange({ status }))}
    {select("Prüffälligkeit", "Alle Prüffälligkeiten", filters.due, dueOptions, due => onChange({ due }))}
  </ListFilterBar>;
}
