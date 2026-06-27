import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Workspace, WorkspaceMain, WorkspaceRail } from "../components/page-layout";
import { toError } from "../app/formatters";
import { ErrorPanel, InlineError, LoadingPanel } from "../components/state-panels";
import { Button, Dialog, Field } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import { PurchaseOrderEditDialog } from "./purchase-orders/purchase-order-edit-dialog";
import { PurchaseOrderDetailMain } from "./purchase-orders/purchase-order-detail-main";
import { PurchaseOrderDetailRail } from "./purchase-orders/purchase-order-detail-rail";
import "./purchase-orders-page.css";

type ReceiptDraft = { lineId: string; lotNumber: string; expiresAt: string; quantity: string };

export function PurchaseOrderDetailPage() {
  const { orderId } = useParams({ from: "/admin/purchase-orders/$orderId" });
  const queryClient = useQueryClient();
  const [includeLineNotes, setIncludeLineNotes] = useState(false);
  const [editingOrder, setEditingOrder] = useState(false);
  const [receiptDraft, setReceiptDraft] = useState<ReceiptDraft | null>(null);
  const session = useQuery({ queryKey: ["session"], queryFn: rescueBaseApi.session });
  const order = useQuery({ queryKey: ["purchase-order", orderId], queryFn: () => rescueBaseApi.purchaseOrder(orderId) });
  const invalidate = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["purchase-order", orderId] }), queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }), queryClient.invalidateQueries({ queryKey: ["batches"] })]);
  };
  const update = useMutation({ mutationFn: (body: Parameters<typeof rescueBaseApi.updatePurchaseOrder>[1]) => rescueBaseApi.updatePurchaseOrder(orderId, body), onSuccess: async () => { setEditingOrder(false); await invalidate(); } });
  const approve = useMutation({ mutationFn: () => rescueBaseApi.approvePurchaseOrder(orderId), onSuccess: invalidate });
  const markOrdered = useMutation({ mutationFn: () => rescueBaseApi.markPurchaseOrderOrdered(orderId), onSuccess: invalidate });
  const receive = useMutation({ mutationFn: (draft: ReceiptDraft) => rescueBaseApi.receivePurchaseOrder(orderId, { lines: [{ lineId: draft.lineId, batches: [{ lotNumber: draft.lotNumber, expiresAt: draft.expiresAt, quantity: Number(draft.quantity) }] }] }), onSuccess: async () => { setReceiptDraft(null); await invalidate(); } });

  if (order.isLoading) return <LoadingPanel label="Bestellung wird geladen" />;
  if (order.isError || !order.data) return <ErrorPanel error={toError(order.error)} onRetry={() => void order.refetch()} />;

  const current = order.data;
  const canApprove = current.status === "DRAFT" && session.data?.user.role === "ADMIN";
  const pdfHref = rescueBaseApi.reportUrl(`/reports/purchase-orders/${current.id}.pdf${includeLineNotes ? "?includeLineNotes=true" : ""}`);

  return (
    <>
      <div className="purchase-order-page-header">
        <Link className="purchase-order-back-link" to="/admin/purchase-orders"><ArrowLeft data-icon="inline-start" />Zurück</Link>
        <PageHeader description={`${current.supplierName} · ${current.location.name}`} title={current.orderNumber} />
      </div>
      <Workspace className="purchase-order-workspace">
        <WorkspaceMain label="Bestellung">
          <PurchaseOrderDetailMain onReceive={(lineId, quantity) => setReceiptDraft({ lineId, lotNumber: "", expiresAt: "", quantity: String(quantity) })} order={current} />
        </WorkspaceMain>
        <WorkspaceRail className="purchase-order-rail" label="Bestellkontext">
          <PurchaseOrderDetailRail canApprove={canApprove} includeLineNotes={includeLineNotes} isApproving={approve.isPending} isOrdering={markOrdered.isPending} onApprove={() => approve.mutate()} onEdit={() => setEditingOrder(true)} onIncludeNotesChange={setIncludeLineNotes} onMarkOrdered={() => markOrdered.mutate()} order={current} pdfHref={pdfHref} />
          {approve.error || markOrdered.error ? <InlineError error={toError(approve.error ?? markOrdered.error)} /> : null}
        </WorkspaceRail>
      </Workspace>
      <PurchaseOrderEditDialog error={update.error ? toError(update.error) : null} isSaving={update.isPending} onClose={() => setEditingOrder(false)} onSave={(body) => update.mutate(body)} open={editingOrder} order={current} />
      <ReceiveDialog draft={receiptDraft} error={receive.error ? toError(receive.error) : null} isSubmitting={receive.isPending} onChange={(patch) => setReceiptDraft((draft) => draft ? { ...draft, ...patch } : draft)} onClose={() => setReceiptDraft(null)} onSubmit={() => receiptDraft && receive.mutate(receiptDraft)} />
    </>
  );
}

function ReceiveDialog(props: { draft: ReceiptDraft | null; error: Error | null; isSubmitting: boolean; onChange: (patch: Partial<ReceiptDraft>) => void; onClose: () => void; onSubmit: () => void }) {
  return <Dialog actions={<><Button onClick={props.onClose} type="button" variant="ghost">Abbrechen</Button><Button disabled={!props.draft?.lotNumber || !props.draft.expiresAt || !props.draft.quantity || props.isSubmitting} onClick={props.onSubmit} type="button">Wareneingang buchen</Button></>} onClose={props.onClose} open={Boolean(props.draft)} title="Wareneingang">{props.draft ? <div className="form-grid form-grid-three"><Field label="Charge"><input autoFocus onChange={(event) => props.onChange({ lotNumber: event.target.value })} value={props.draft.lotNumber} /></Field><Field label="Ablaufdatum"><input onChange={(event) => props.onChange({ expiresAt: event.target.value })} type="date" value={props.draft.expiresAt} /></Field><Field label="Menge"><input min="1" onChange={(event) => props.onChange({ quantity: event.target.value })} type="number" value={props.draft.quantity} /></Field>{props.error ? <InlineError error={props.error} /> : null}</div> : null}</Dialog>;
}
