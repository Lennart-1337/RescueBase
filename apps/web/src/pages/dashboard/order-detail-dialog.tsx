import { useEffect, useState } from "react";
import { XCircle } from "lucide-react";
import { Button, Dialog } from "../../components/ui";
import type { Batch, ReplenishmentOrder } from "../../lib/types";
import { OrderDetail } from "./order-detail";
import "./order-detail-dialog.css";

export function OrderDetailDialog(props: { batches: Batch[]; error: Error | null; formatReason: (reason: string) => string; formatStatus: (status: string) => string; isOpen: boolean; isSubmitting: boolean; onCancel: () => void; onClose: () => void; onFulfill: (items: Array<{ itemId: string; batchId: string; quantity: number }>) => void; order: ReplenishmentOrder | null; pdfHref?: string; selectedBatchQuantity: (batches: Batch[], batchId: string) => number; }) {
  const [fulfillmentItems, setFulfillmentItems] = useState<Array<{ itemId: string; batchId: string; quantity: number }>>([]);
  useEffect(() => setFulfillmentItems([]), [props.order?.id, props.isOpen]);

  const submitDisabled = fulfillmentItems.length === 0 || props.isSubmitting || props.order?.status === "DONE" || props.order?.status === "CANCELLED";
  const showCancel = props.order?.status === "OPEN";

  return (
    <Dialog actions={<>
      {showCancel ? <Button disabled={props.isSubmitting} onClick={props.onCancel} type="button" variant="danger"><XCircle data-icon="inline-start" />Stornieren</Button> : null}
      <Button className="order-detail-submit" disabled={submitDisabled} onClick={() => props.onFulfill(fulfillmentItems)} type="button">Teilfüllung buchen</Button>
    </>} onClose={props.onClose} open={props.isOpen} title="Nachfüllauftrag">
      {props.order ? <OrderDetail batches={props.batches} error={props.error} formatReason={props.formatReason} formatStatus={props.formatStatus} onFulfillmentItemsChange={setFulfillmentItems} order={props.order} pdfHref={props.pdfHref ?? ""} selectedBatchQuantity={props.selectedBatchQuantity} /> : null}
    </Dialog>
  );
}
