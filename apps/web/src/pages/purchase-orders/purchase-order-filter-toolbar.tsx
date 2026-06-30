import { ListFilterBar } from "../../components/list-filter-bar";
import { SearchableSelect } from "../../components/searchable-select";
import { Field } from "../../components/ui";
import type { PurchaseOrderStatus } from "../../lib/types";
import { formatPurchaseStatus } from "./format";

type PurchaseOrderFilters = { q?: string; status?: string };

export function PurchaseOrderFilterToolbar(props: {
  countLabel: string;
  filters: PurchaseOrderFilters;
  onChange: (patch: Partial<PurchaseOrderFilters>) => void;
  onReset: () => void;
}) {
  const statusOptions = [
    { label: "Alle Status", value: "" },
    ...(["DRAFT", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED"] as PurchaseOrderStatus[]).map((status) => ({
      label: formatPurchaseStatus(status),
      value: status
    }))
  ];
  return (
    <ListFilterBar countLabel={props.countLabel} fieldsClassName="form-grid-two" onReset={props.onReset}>
      <Field label="Suche"><input onChange={(event) => props.onChange({ q: event.target.value })} placeholder="Nummer, Lieferant oder Zielort" value={props.filters.q ?? ""} /></Field>
      <Field label="Status"><SearchableSelect emptyLabel="Alle Status" onChange={(value) => props.onChange({ status: value })} options={statusOptions} value={props.filters.status ?? ""} /></Field>
    </ListFilterBar>
  );
}
