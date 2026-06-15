import { Dialog } from "../../components/ui";
import type { Batch, ReplenishmentOrder } from "../../lib/types";
import { OrderDetail } from "./order-detail";

export function OrderDetailDialog(props: { batches: Batch[]; error: Error | null; formatReason: (reason: string) => string; formatStatus: (status: string) => string; isOpen: boolean; isSubmitting: boolean; onClose: () => void; onFulfill: (items: Array<{ itemId: string; batchId: string; quantity: number }>) => void; order: ReplenishmentOrder | null; pdfHref?: string; selectedBatchQuantity: (batches: Batch[], batchId: string) => number; }) {
  return (
    <Dialog description="Chargengenaue Teilfüllungen und Restmengen eines Nachfüllauftrags." onClose={props.onClose} open={props.isOpen} title="Nachfüllauftrag">
      {props.order ? <OrderDetail batches={props.batches} error={props.error} formatReason={props.formatReason} formatStatus={props.formatStatus} isSubmitting={props.isSubmitting} onFulfill={props.onFulfill} order={props.order} pdfHref={props.pdfHref ?? ""} selectedBatchQuantity={props.selectedBatchQuantity} /> : null}
    </Dialog>
  );
}
