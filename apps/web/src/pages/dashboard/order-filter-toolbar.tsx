import { ListFilterBar } from "../../components/list-filter-bar";
import { SearchableSelect } from "../../components/searchable-select";
import { Field } from "../../components/ui";
import type { Kit } from "../../lib/types";

type OrderFilters = { orderLocationId: string; orderQ: string; orderStatus: string };

export function OrderFilterToolbar(props: { countLabel: string; filters: OrderFilters; kits: Kit[]; onChange: (patch: Partial<OrderFilters>) => void; onReset: () => void }) {
  const locations = Array.from(new Map(props.kits.filter((kit) => kit.location).map((kit) => [kit.location!.id, { label: kit.location!.name, value: kit.location!.id }])).values());
  return (
    <ListFilterBar countLabel={props.countLabel} fieldsClassName="form-grid-three" onReset={props.onReset}>
      <Field label="Suche"><input onChange={(event) => props.onChange({ orderQ: event.target.value })} placeholder="Rucksackname oder Kennung" value={props.filters.orderQ} /></Field>
      <Field label="Standort"><SearchableSelect emptyLabel="Alle Standorte" onChange={(value) => props.onChange({ orderLocationId: value })} options={[{ label: "Alle Standorte", value: "" }, ...locations]} value={props.filters.orderLocationId} /></Field>
      <Field label="Status"><select onChange={(event) => props.onChange({ orderStatus: event.target.value })} value={props.filters.orderStatus}><option value="">Alle Status</option><option value="OPEN">Offen</option><option value="DONE">Erledigt</option><option value="CANCELLED">Storniert</option></select></Field>
    </ListFilterBar>
  );
}
