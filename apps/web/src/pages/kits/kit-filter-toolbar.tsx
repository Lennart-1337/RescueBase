import { ListFilterBar } from "../../components/list-filter-bar";
import { SearchableSelect } from "../../components/searchable-select";
import { Field } from "../../components/ui";
import type { KitTemplate, Location } from "../../lib/types";

export type KitFilters = { locationId: string; q: string; status: string; templateId: string };

export function KitFilterToolbar(props: { countLabel: string; filters: KitFilters; locations: Location[]; onChange: (patch: Partial<KitFilters>) => void; onReset: () => void; templates: KitTemplate[] }) {
  return (
    <ListFilterBar countLabel={props.countLabel} onReset={props.onReset}>
      <Field label="Suche"><input onChange={(event) => props.onChange({ q: event.target.value })} placeholder="Name oder Kennung" value={props.filters.q} /></Field>
      <Field label="Standort"><SearchableSelect emptyLabel="Alle Standorte" onChange={(value) => props.onChange({ locationId: value })} options={[{ label: "Alle Standorte", value: "" }, ...props.locations.map((location) => ({ label: location.name, value: location.id }))]} value={props.filters.locationId} /></Field>
      <Field label="Vorlage"><SearchableSelect emptyLabel="Alle Vorlagen" onChange={(value) => props.onChange({ templateId: value })} options={[{ label: "Alle Vorlagen", value: "" }, ...props.templates.map((template) => ({ label: `${template.name} v${template.version}`, value: template.id }))]} value={props.filters.templateId} /></Field>
      <Field label="Status"><select onChange={(event) => props.onChange({ status: event.target.value })} value={props.filters.status}><option value="">Alle Status</option><option value="READY">Bereit</option><option value="CONDITIONAL">Bedingt einsatzbereit</option><option value="NOT_READY">Nicht einsatzbereit</option></select></Field>
    </ListFilterBar>
  );
}
