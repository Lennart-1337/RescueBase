import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, PackageCheck, Save, Send } from "lucide-react";
import { PageHeader } from "../components/page-layout";
import { toError } from "../app/formatters";
import { ErrorPanel, InlineError, LoadingPanel } from "../components/state-panels";
import { AnchorButton, Badge, Button, Dialog, Field, Panel } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser, PurchaseOrder } from "../lib/types";
import { formatMoney, formatPurchaseStatus, purchaseStatusTone } from "./purchase-orders/format";
import "./purchase-orders-page.css";

type ReceiptDraft = { lineId: string; lotNumber: string; expiresAt: string; quantity: string };

export function PurchaseOrderDetailPage({ user }: { user: AuthenticatedUser }) {
  const { orderId } = useParams({ from: "/admin/purchase-orders/$orderId" });
  const queryClient = useQueryClient();
  const [includeLineNotes, setIncludeLineNotes] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [notes, setNotes] = useState("");
  const [lineNotes, setLineNotes] = useState<Record<string, string>>({});
  const [receiptDraft, setReceiptDraft] = useState<ReceiptDraft | null>(null);
  const order = useQuery({ queryKey: ["purchase-order", orderId], queryFn: () => rescueBaseApi.purchaseOrder(orderId) });
  const invalidate = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["purchase-order", orderId] }), queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }), queryClient.invalidateQueries({ queryKey: ["batches"] })]);
  };
  const update = useMutation({ mutationFn: (body: Parameters<typeof rescueBaseApi.updatePurchaseOrder>[1]) => rescueBaseApi.updatePurchaseOrder(orderId, body), onSuccess: async () => { setEditingNotes(false); await invalidate(); } });
  const approve = useMutation({ mutationFn: () => rescueBaseApi.approvePurchaseOrder(orderId), onSuccess: invalidate });
  const markOrdered = useMutation({ mutationFn: () => rescueBaseApi.markPurchaseOrderOrdered(orderId), onSuccess: invalidate });
  const receive = useMutation({ mutationFn: (draft: ReceiptDraft) => rescueBaseApi.receivePurchaseOrder(orderId, { lines: [{ lineId: draft.lineId, batches: [{ lotNumber: draft.lotNumber, expiresAt: draft.expiresAt, quantity: Number(draft.quantity) }] }] }), onSuccess: async () => { setReceiptDraft(null); await invalidate(); } });

  if (order.isLoading) return <LoadingPanel label="Bestellung wird geladen" />;
  if (order.isError || !order.data) return <ErrorPanel error={toError(order.error)} onRetry={() => void order.refetch()} />;

  const current = order.data;
  const pdfHref = rescueBaseApi.reportUrl(`/reports/purchase-orders/${current.id}.pdf${includeLineNotes ? "?includeLineNotes=true" : ""}`);

  function startEditing() {
    setSupplierName(current.supplierName);
    setNotes(current.notes ?? "");
    setLineNotes(Object.fromEntries(current.lines.map((line) => [line.id, line.note ?? ""])));
    setEditingNotes(true);
  }

  function saveNotes() {
    update.mutate({
      supplierName,
      notes,
      lineNotes: current.lines.map((line) => ({ lineId: line.id, note: lineNotes[line.id] ?? "" }))
    });
  }

  return (
    <>
      <PageHeader actions={<><label className="check-field check-field-compact"><input checked={includeLineNotes} onChange={(event) => setIncludeLineNotes(event.target.checked)} type="checkbox" /><span>Positionsnotizen</span></label><AnchorButton href={pdfHref} rel="noreferrer" target="_blank" variant="secondary"><Download data-icon="inline-start" />PDF</AnchorButton></>} title={current.orderNumber} />
      <div className="purchase-order-detail-grid">
        <Panel>
          <div className="panel-header">
            <div><h2>{current.supplierName}</h2><p>{current.location.name} · {formatMoney(current.totalGrossCents)}</p></div>
            <Badge tone={purchaseStatusTone(current.status)}>{formatPurchaseStatus(current.status)}</Badge>
          </div>
          <div className="purchase-order-summary">
            {current.approvedByName ? <Badge>Freigegeben von {current.approvedByName}</Badge> : null}
            {current.notes ? <Badge>Hinweise vorhanden</Badge> : null}
          </div>
          <div className="table">
            {current.lines.map((line) => (
              <div className="compact-list-row" key={line.id}>
                <span><strong>{line.articleName}</strong><small>{line.supplierArticleNumber ?? "Keine Art.-Nr."} · {line.receivedQuantity}/{line.orderedQuantity} {line.unit} · {formatMoney(line.lineTotalGrossCents)}</small>{line.note ? <small>{line.note}</small> : null}</span>
                <div className="row-action-buttons">
                  {line.articleUrl ? <AnchorButton href={line.articleUrl} rel="noreferrer" target="_blank" variant="secondary">Link</AnchorButton> : null}
                  {(current.status === "ORDERED" || current.status === "PARTIALLY_RECEIVED") && line.remainingQuantity > 0 ? <Button onClick={() => setReceiptDraft({ lineId: line.id, lotNumber: "", expiresAt: "", quantity: String(line.remainingQuantity) })} type="button" variant="secondary"><PackageCheck data-icon="inline-start" />Wareneingang</Button> : null}
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <div className="panel-header"><h2>Aktionen</h2></div>
          <div className="purchase-order-form">
            {current.status === "DRAFT" && user.role === "ADMIN" ? <Button disabled={approve.isPending} onClick={() => approve.mutate()} type="button"><Save data-icon="inline-start" />Freigeben</Button> : null}
            {current.status === "APPROVED" ? <Button disabled={markOrdered.isPending} onClick={() => markOrdered.mutate()} type="button"><Send data-icon="inline-start" />Als bestellt markieren</Button> : null}
            <Button onClick={startEditing} type="button" variant="secondary">Hinweise bearbeiten</Button>
            {approve.error || markOrdered.error ? <InlineError error={toError(approve.error ?? markOrdered.error)} /> : null}
          </div>
        </Panel>
      </div>
      <NotesDialog current={current} error={update.error ? toError(update.error) : null} lineNotes={lineNotes} notes={notes} onClose={() => setEditingNotes(false)} onLineNoteChange={(lineId, value) => setLineNotes((existing) => ({ ...existing, [lineId]: value }))} onNotesChange={setNotes} onSave={saveNotes} onSupplierChange={setSupplierName} open={editingNotes} supplierName={supplierName} />
      <ReceiveDialog draft={receiptDraft} error={receive.error ? toError(receive.error) : null} isSubmitting={receive.isPending} onChange={(patch) => setReceiptDraft((draft) => draft ? { ...draft, ...patch } : draft)} onClose={() => setReceiptDraft(null)} onSubmit={() => receiptDraft && receive.mutate(receiptDraft)} />
    </>
  );
}

function NotesDialog(props: { current: PurchaseOrder; error: Error | null; lineNotes: Record<string, string>; notes: string; onClose: () => void; onLineNoteChange: (lineId: string, value: string) => void; onNotesChange: (value: string) => void; onSave: () => void; onSupplierChange: (value: string) => void; open: boolean; supplierName: string }) {
  return <Dialog actions={<><Button onClick={props.onClose} type="button" variant="ghost">Abbrechen</Button><Button onClick={props.onSave} type="button">Speichern</Button></>} onClose={props.onClose} open={props.open} title="Hinweise bearbeiten"><div className="purchase-order-form"><Field label="Lieferant"><input onChange={(event) => props.onSupplierChange(event.target.value)} value={props.supplierName} /></Field><Field label="Bestellhinweise"><textarea onChange={(event) => props.onNotesChange(event.target.value)} rows={3} value={props.notes} /></Field>{props.current.lines.map((line) => <Field key={line.id} label={`Notiz: ${line.articleName}`}><input onChange={(event) => props.onLineNoteChange(line.id, event.target.value)} value={props.lineNotes[line.id] ?? ""} /></Field>)}{props.error ? <InlineError error={props.error} /> : null}</div></Dialog>;
}

function ReceiveDialog(props: { draft: ReceiptDraft | null; error: Error | null; isSubmitting: boolean; onChange: (patch: Partial<ReceiptDraft>) => void; onClose: () => void; onSubmit: () => void }) {
  return <Dialog actions={<><Button onClick={props.onClose} type="button" variant="ghost">Abbrechen</Button><Button disabled={!props.draft?.lotNumber || !props.draft.expiresAt || !props.draft.quantity || props.isSubmitting} onClick={props.onSubmit} type="button">Wareneingang buchen</Button></>} onClose={props.onClose} open={Boolean(props.draft)} title="Wareneingang">{props.draft ? <div className="form-grid form-grid-three"><Field label="Charge"><input autoFocus onChange={(event) => props.onChange({ lotNumber: event.target.value })} value={props.draft.lotNumber} /></Field><Field label="Ablaufdatum"><input onChange={(event) => props.onChange({ expiresAt: event.target.value })} type="date" value={props.draft.expiresAt} /></Field><Field label="Menge"><input min="1" onChange={(event) => props.onChange({ quantity: event.target.value })} type="number" value={props.draft.quantity} /></Field>{props.error ? <InlineError error={props.error} /> : null}</div> : null}</Dialog>;
}
