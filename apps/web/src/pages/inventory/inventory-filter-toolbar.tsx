import { ListFilterBar } from "../../components/list-filter-bar";
import { SearchableSelect } from "../../components/searchable-select";
import { CheckboxField, Field } from "../../components/ui";
import type { Article, Location } from "../../lib/types";
import type { InventoryFilters } from "./types";

export function InventoryFilterToolbar(props: { articles: Article[]; countLabel: string; filters: InventoryFilters; locations: Location[]; onChange: (patch: Partial<InventoryFilters>) => void; onReset: () => void }) {
  return (
    <ListFilterBar countLabel={props.countLabel} fieldsClassName="inventory-filter-grid" onReset={props.onReset}>
      <Field label="Suche"><input onChange={(event) => props.onChange({ q: event.target.value })} placeholder="Artikel oder Charge" value={props.filters.q} /></Field>
      <Field label="Standort"><SearchableSelect emptyLabel="Alle Standorte" onChange={(value) => props.onChange({ locationId: value })} options={[{ label: "Alle Standorte", value: "" }, ...props.locations.map((location) => ({ label: location.name, value: location.id }))]} value={props.filters.locationId} /></Field>
      <Field label="Artikel"><SearchableSelect emptyLabel="Alle Artikel" onChange={(value) => props.onChange({ articleId: value })} options={[{ label: "Alle Artikel", value: "" }, ...props.articles.map((article) => ({ label: article.name, value: article.id }))]} value={props.filters.articleId} /></Field>
      <Field label="Ablaufdatum"><select onChange={(event) => props.onChange({ expiryOrder: event.target.value as InventoryFilters["expiryOrder"] })} value={props.filters.expiryOrder}><option value="asc">Früheste zuerst</option><option value="desc">Späteste zuerst</option></select></Field>
      <div className="inventory-filter-toggles">
        <CheckboxField checked={props.filters.showEmpty} label="Chargen mit Menge 0 anzeigen" onChange={(event) => props.onChange({ showEmpty: event.target.checked })} />
        <CheckboxField checked={props.filters.showExpired} label="Nur abgelaufene Chargen" onChange={(event) => props.onChange({ showExpired: event.target.checked })} />
      </div>
    </ListFilterBar>
  );
}
