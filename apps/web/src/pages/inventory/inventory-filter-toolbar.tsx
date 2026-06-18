import { ListFilterBar } from "../../components/list-filter-bar";
import { SearchableSelect } from "../../components/searchable-select";
import { Field } from "../../components/ui";
import type { Article, Location } from "../../lib/types";
import type { InventoryFilters } from "./types";

export function InventoryFilterToolbar(props: { articles: Article[]; countLabel: string; filters: InventoryFilters; locations: Location[]; onChange: (patch: Partial<InventoryFilters>) => void; onReset: () => void }) {
  return (
    <ListFilterBar countLabel={props.countLabel} onReset={props.onReset}>
      <Field label="Suche"><input onChange={(event) => props.onChange({ q: event.target.value })} placeholder="Artikel oder Charge" value={props.filters.q} /></Field>
      <Field label="Standort"><SearchableSelect emptyLabel="Alle Standorte" onChange={(value) => props.onChange({ locationId: value })} options={[{ label: "Alle Standorte", value: "" }, ...props.locations.map((location) => ({ label: location.name, value: location.id }))]} value={props.filters.locationId} /></Field>
      <Field label="Artikel"><SearchableSelect emptyLabel="Alle Artikel" onChange={(value) => props.onChange({ articleId: value })} options={[{ label: "Alle Artikel", value: "" }, ...props.articles.map((article) => ({ label: article.name, value: article.id }))]} value={props.filters.articleId} /></Field>
      <label className="check-field"><input checked={props.filters.showEmpty} onChange={(event) => props.onChange({ showEmpty: event.target.checked })} type="checkbox" /><span>Chargen mit Menge 0 anzeigen</span></label>
    </ListFilterBar>
  );
}
