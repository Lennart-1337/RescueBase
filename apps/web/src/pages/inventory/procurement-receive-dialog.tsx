import { Plus, Trash2 } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Button, Dialog, Field } from "../../components/ui";
import type { InventoryProcurementOrder } from "../../lib/types";
import type { ReceiptDraftItem } from "./types";

export function ProcurementReceiveDialog(props: {
  draftItems: ReceiptDraftItem[];
  error: Error | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onAddItem: () => void;
  onChangeItem: (index: number, item: ReceiptDraftItem) => void;
  onClose: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: () => void;
  onVerifiedChange: (verified: boolean) => void;
  order: InventoryProcurementOrder | null;
  verified: boolean;
}) {
  return (
    <Dialog
      actions={<><Button disabled={props.isSubmitting || !props.order || !props.verified} onClick={props.onSubmit} type="button">Wareneingang buchen</Button><Button onClick={props.onClose} type="button" variant="secondary">Abbrechen</Button></>}
      description={props.order ? `${props.order.article.name} · offen ${props.order.remainingQuantity} ${props.order.article.unit}` : undefined}
      onClose={props.onClose}
      open={props.isOpen}
      title="Wareneingang"
    >
      <div className="compact-list">
        {props.draftItems.map((item, index) => (
          <div className="compact-list-row compact-list-row-actions" key={index}>
            <div className="form-grid form-grid-three procurement-receipt-grid">
              <Field label="Chargennummer"><input value={item.lotNumber} onChange={(event) => props.onChangeItem(index, { ...item, lotNumber: event.target.value })} /></Field>
              <Field label="Ablaufdatum"><input type="date" value={item.expiresAt} onChange={(event) => props.onChangeItem(index, { ...item, expiresAt: event.target.value })} /></Field>
              <Field label="Menge"><input min="1" type="number" value={item.quantity} onChange={(event) => props.onChangeItem(index, { ...item, quantity: event.target.value })} /></Field>
            </div>
            <Button aria-label="Wareneingangsposition entfernen" onClick={() => props.onRemoveItem(index)} type="button" variant="ghost"><Trash2 data-icon="inline-start" /></Button>
          </div>
        ))}
      </div>
      <label className="check-field">
        <input checked={props.verified} onChange={(event) => props.onVerifiedChange(event.target.checked)} type="checkbox" />
        <span>Lieferung geprüft: Artikel, Menge, Charge und Ablaufdatum stimmen mit der Lieferung überein.</span>
      </label>
      {props.error ? <InlineError error={props.error} /> : null}
      <Button onClick={props.onAddItem} type="button" variant="secondary"><Plus data-icon="inline-start" />Position hinzufügen</Button>
    </Dialog>
  );
}
