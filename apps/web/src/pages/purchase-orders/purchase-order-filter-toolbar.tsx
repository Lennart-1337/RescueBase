import { ListFilterBar } from "../../components/list-filter-bar";
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
  return (
    <ListFilterBar countLabel={props.countLabel} fieldsClassName="form-grid-two" onReset={props.onReset}>
      <Field label="Suche"><input onChange={(event) => props.onChange({ q: event.target.value })} placeholder="Nummer, Lieferant oder Zielort" value={props.filters.q ?? ""} /></Field>
      <Field label="Status">
        <select onChange={(event) => props.onChange({ status: event.target.value })} value={props.filters.status ?? ""}>
          <option value="">Alle Status</option>
          {(["DRAFT", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED"] as PurchaseOrderStatus[]).map((status) => (
            <option key={status} value={status}>{formatPurchaseStatus(status)}</option>
          ))}
        </select>
      </Field>
    </ListFilterBar>
  );
}
