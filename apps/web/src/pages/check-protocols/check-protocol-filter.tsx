import { ListFilterBar } from "../../components/list-filter-bar";
import { SearchableSelect } from "../../components/searchable-select";
import { Field } from "../../components/ui";
import type { Kit } from "../../lib/types";

export type CheckProtocolFilters = { kitId: string; q: string; status: string };

export function CheckProtocolFilter(props: { count: number; filters: CheckProtocolFilters; kits: Kit[]; onChange: (patch: Partial<CheckProtocolFilters>) => void; onReset: () => void }) {
  const statusOptions = [
    { label: "Alle Status", value: "" },
    { label: "Bereit", value: "READY" },
    { label: "Bedingt einsatzbereit", value: "CONDITIONAL" },
    { label: "Nicht einsatzbereit", value: "NOT_READY" }
  ];
  return (
    <ListFilterBar countLabel={`${props.count} Protokolle`} fieldsClassName="form-grid-three" onReset={props.onReset}>
      <Field label="Suche"><input onChange={(event) => props.onChange({ q: event.target.value })} placeholder="Prüfer, Rucksack oder Kennung" value={props.filters.q} /></Field>
      <Field label="Rucksack"><SearchableSelect emptyLabel="Alle Rucksäcke" onChange={(value) => props.onChange({ kitId: value })} options={[{ label: "Alle Rucksäcke", value: "" }, ...props.kits.map((kit) => ({ label: kit.name, value: kit.id, keywords: [kit.code] }))]} value={props.filters.kitId} /></Field>
      <Field label="Status"><SearchableSelect emptyLabel="Alle Status" onChange={(value) => props.onChange({ status: value })} options={statusOptions} value={props.filters.status} /></Field>
    </ListFilterBar>
  );
}
