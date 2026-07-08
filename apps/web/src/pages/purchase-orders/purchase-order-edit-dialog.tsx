import { useEffect, useState } from "react";
import { SearchableSelect } from "../../components/searchable-select";
import { Dialog, Button, Field } from "../../components/ui";
import { InlineError, LoadingPanel } from "../../components/state-panels";
import type { Article, PurchaseOrder, Supplier, UpdatePurchaseOrderRequest } from "../../lib/types";
import { useQuery } from "@tanstack/react-query";
import { catalogQueries } from "../../queries/catalog";
import { centsInput, parseCents } from "./format";
import "../purchase-orders-page.css";

type DraftLine = { articleId: string; quantity: string; price: string; note: string; supplierArticleNumber: string };

export function PurchaseOrderEditDialog(props: {
  error: Error | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (body: UpdatePurchaseOrderRequest) => void;
  open: boolean;
  order: PurchaseOrder;
}) {
  const isDraft = props.order.status === "DRAFT";
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [lineNotes, setLineNotes] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const articles = useQuery(catalogQueries.articles(props.open && isDraft));
  const suppliers = useQuery(catalogQueries.suppliers(props.open));
  const locations = useQuery(catalogQueries.locations(props.open && isDraft));

  useEffect(() => {
    if (!props.open) return;
    setSupplierId(props.order.supplierId);
    setLocationId(props.order.locationId);
    setNotes(props.order.notes ?? "");
    setLineNotes(Object.fromEntries(props.order.lines.map((line) => [line.id, line.note ?? ""])));
    setLines(props.order.lines.map((line) => ({
      articleId: line.articleId,
      quantity: String(line.orderedQuantity),
      price: centsInput(line.grossUnitPriceCents),
      note: line.note ?? "",
      supplierArticleNumber: line.supplierArticleNumber ?? ""
    })));
  }, [props.open, props.order]);

  const canSaveDraft = supplierId && locationId && lines.some((line) => line.articleId && Number(line.quantity) > 0);
  const canSaveApproved = Boolean(supplierId);

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  function save() {
    if (isDraft) {
      props.onSave({
        supplierId,
        locationId,
        notes,
        lines: lines.filter((line) => line.articleId).map((line) => ({
          articleId: line.articleId,
          orderedQuantity: Number.parseInt(line.quantity, 10),
          grossUnitPriceCents: parseCents(line.price),
          note: line.note.trim() || undefined,
          supplierArticleNumber: line.supplierArticleNumber.trim() || undefined
        }))
      });
      return;
    }
    props.onSave({
      supplierId,
      notes,
      lineNotes: props.order.lines.map((line) => ({ lineId: line.id, note: lineNotes[line.id] ?? "" }))
    });
  }

  return (
    <Dialog
      actions={<><Button onClick={props.onClose} type="button" variant="secondary">Abbrechen</Button><Button disabled={isDraft ? !canSaveDraft : !canSaveApproved} loading={props.isSaving} onClick={save} type="button">{isDraft ? "Bestellung speichern" : "Hinweise speichern"}</Button></>}
      bodyClassName="purchase-order-edit-body"
      onClose={props.onClose}
      open={props.open}
      size={isDraft ? "wide" : "default"}
      title={isDraft ? "Bestellung bearbeiten" : "Hinweise bearbeiten"}
    >
      {isDraft ? <DraftEditor articles={articles.data ?? []} error={props.error} lines={lines} loading={articles.isLoading || suppliers.isLoading || locations.isLoading} locationId={locationId} locations={locations.data ?? []} notes={notes} onAddLine={() => setLines((current) => [...current, emptyLine()])} onLineRemove={(index) => setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index))} onLineUpdate={updateLine} onLocationChange={setLocationId} onNotesChange={setNotes} onSupplierChange={setSupplierId} supplierId={supplierId} suppliers={suppliers.data ?? []} /> : <ApprovedEditor current={props.order} error={props.error} lineNotes={lineNotes} notes={notes} onLineNoteChange={(lineId, value) => setLineNotes((existing) => ({ ...existing, [lineId]: value }))} onNotesChange={setNotes} onSupplierChange={setSupplierId} supplierId={supplierId} suppliers={suppliers.data ?? []} />}
    </Dialog>
  );
}

function DraftEditor(props: {
  articles: Article[];
  error: Error | null;
  lines: DraftLine[];
  loading: boolean;
  locationId: string;
  locations: Array<{ id: string; name: string }>;
  notes: string;
  onAddLine: () => void;
  onLineRemove: (index: number) => void;
  onLineUpdate: (index: number, patch: Partial<DraftLine>) => void;
  onLocationChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSupplierChange: (value: string) => void;
  supplierId: string;
  suppliers: Supplier[];
}) {
  if (props.loading) return <LoadingPanel label="Bearbeitung wird vorbereitet" />;
  if (!props.articles.length || !props.locations.length || !props.suppliers.length) return <InlineError error={new Error("Stammdaten konnten nicht geladen werden.")} />;
  return <div className="purchase-order-form"><div className="purchase-order-draft-grid"><Field className="purchase-order-draft-supplier" label="Lieferant"><SearchableSelect onChange={props.onSupplierChange} options={props.suppliers.map((supplier) => ({ label: supplier.name, value: supplier.id }))} value={props.supplierId} /></Field><Field className="purchase-order-draft-location" label="Zielort"><SearchableSelect onChange={props.onLocationChange} options={props.locations.map((location) => ({ label: location.name, value: location.id }))} value={props.locationId} /></Field><Field className="purchase-order-draft-notes" label="Hinweise"><input onChange={(event) => props.onNotesChange(event.target.value)} value={props.notes} /></Field></div><div className="purchase-order-lines">{props.lines.map((line, index) => <DraftLineEditor articles={props.articles} index={index} key={index} line={line} onRemove={() => props.onLineRemove(index)} onUpdate={(patch) => props.onLineUpdate(index, patch)} />)}</div><div className="purchase-order-dialog-actions"><Button onClick={props.onAddLine} type="button" variant="secondary">Position hinzufügen</Button></div>{props.error ? <InlineError error={props.error} /> : null}</div>;
}

function DraftLineEditor(props: { articles: Article[]; index: number; line: DraftLine; onRemove: () => void; onUpdate: (patch: Partial<DraftLine>) => void }) {
  return <div className="purchase-order-line-editor"><Field label="Artikel"><SearchableSelect emptyLabel="Artikel wählen" onChange={(value) => props.onUpdate({ articleId: value, price: centsInput(props.articles.find((entry) => entry.id === value)?.defaultGrossPriceCents), supplierArticleNumber: props.articles.find((entry) => entry.id === value)?.manufacturerPartNumber ?? "" })} options={props.articles.map((entry) => ({ label: entry.name, value: entry.id, keywords: [entry.manufacturer ?? "", entry.barcode ?? ""] }))} value={props.line.articleId} /></Field><Field label="Menge"><input min="1" onChange={(event) => props.onUpdate({ quantity: event.target.value })} type="number" value={props.line.quantity} /></Field><Field label="Preis"><input inputMode="decimal" onChange={(event) => props.onUpdate({ price: event.target.value })} value={props.line.price} /></Field><Field label="Art.-Nr."><input onChange={(event) => props.onUpdate({ supplierArticleNumber: event.target.value })} value={props.line.supplierArticleNumber} /></Field><Field label="Notiz"><input onChange={(event) => props.onUpdate({ note: event.target.value })} value={props.line.note} /></Field><div className="purchase-order-line-remove"><Button aria-label={`Position ${props.index + 1} entfernen`} className="purchase-order-line-remove-button" onClick={props.onRemove} type="button" variant="danger">Entfernen</Button></div></div>;
}

function ApprovedEditor(props: { current: PurchaseOrder; error: Error | null; lineNotes: Record<string, string>; notes: string; onLineNoteChange: (lineId: string, value: string) => void; onNotesChange: (value: string) => void; onSupplierChange: (value: string) => void; supplierId: string; suppliers: Supplier[] }) {
  return <div className="purchase-order-form"><Field label="Lieferant"><SearchableSelect onChange={props.onSupplierChange} options={props.suppliers.map((supplier) => ({ label: supplier.name, value: supplier.id }))} value={props.supplierId} /></Field><Field label="Bestellhinweise"><textarea onChange={(event) => props.onNotesChange(event.target.value)} rows={3} value={props.notes} /></Field>{props.current.lines.map((line) => <Field key={line.id} label={`Notiz: ${line.articleName}`}><input onChange={(event) => props.onLineNoteChange(line.id, event.target.value)} value={props.lineNotes[line.id] ?? ""} /></Field>)}{props.error ? <InlineError error={props.error} /> : null}</div>;
}

function emptyLine(): DraftLine {
  return { articleId: "", quantity: "1", price: "", note: "", supplierArticleNumber: "" };
}
