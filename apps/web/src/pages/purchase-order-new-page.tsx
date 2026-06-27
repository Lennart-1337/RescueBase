import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "../components/page-layout";
import { toError } from "../app/formatters";
import { SearchableSelect } from "../components/searchable-select";
import { ErrorPanel, InlineError, LoadingPanel } from "../components/state-panels";
import { Button, Field, Panel, Tabs } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import type { Article, InventoryTarget } from "../lib/types";
import { centsInput, parseCents } from "./purchase-orders/format";
import "./purchase-orders-page.css";
import "./purchase-order-new-page.css";

type DraftLine = { articleId: string; quantity: string; price: string; note: string; supplierArticleNumber: string };

export function PurchaseOrderNewPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/admin/purchase-orders/new" }) as { mode?: string };
  const queryClient = useQueryClient();
  const [mode, setMode] = useState(search.mode === "shortages" ? "shortages" : "manual");
  const [supplierName, setSupplierName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [groupingMode, setGroupingMode] = useState<"single" | "supplier">("single");
  const [shortageArticleIds, setShortageArticleIds] = useState<string[]>([]);
  const articles = useQuery({ queryKey: ["articles"], queryFn: rescueBaseApi.articles });
  const locations = useQuery({ queryKey: ["locations"], queryFn: rescueBaseApi.locations });
  const targets = useQuery({ queryKey: ["inventory-targets"], queryFn: rescueBaseApi.inventoryTargets });
  const createManual = useMutation({ mutationFn: rescueBaseApi.createPurchaseOrder, onSuccess: onCreated });
  const createFromShortages = useMutation({ mutationFn: rescueBaseApi.createPurchaseOrdersFromShortages, onSuccess: (orders) => onCreated(orders[0]) });

  if (articles.isLoading || locations.isLoading || targets.isLoading) return <LoadingPanel label="Bestellung wird vorbereitet" />;
  if (articles.isError || locations.isError || targets.isError || !articles.data || !locations.data || !targets.data) {
    return <ErrorPanel error={toError(articles.error ?? locations.error ?? targets.error)} onRetry={() => void Promise.all([articles.refetch(), locations.refetch(), targets.refetch()])} />;
  }

  const selectedLocationId = locationId || locations.data[0]?.id || "";
  const shortages = targets.data.filter((target) => target.locationId === selectedLocationId && target.shortageQuantity > 0);
  const canSubmitManual = supplierName.trim() && selectedLocationId && lines.some((line) => line.articleId && Number(line.quantity) > 0);
  const canSubmitShortages = selectedLocationId && shortageArticleIds.length > 0 && (groupingMode === "supplier" || supplierName.trim());

  async function onCreated(order: { id: string } | undefined) {
    await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    if (order) void navigate({ params: { orderId: order.id }, to: "/admin/purchase-orders/$orderId" });
  }

  function submitManual() {
    if (!canSubmitManual) return;
    createManual.mutate({
      supplierName,
      locationId: selectedLocationId,
      notes: notes.trim() || undefined,
      lines: lines.filter((line) => line.articleId).map((line) => ({
        articleId: line.articleId,
        orderedQuantity: Number.parseInt(line.quantity, 10),
        grossUnitPriceCents: parseCents(line.price),
        note: line.note.trim() || undefined,
        supplierArticleNumber: line.supplierArticleNumber.trim() || undefined
      }))
    });
  }

  function submitShortages() {
    if (!canSubmitShortages) return;
    createFromShortages.mutate({
      articleIds: shortageArticleIds,
      groupingMode,
      locationId: selectedLocationId,
      supplierName: groupingMode === "single" ? supplierName : undefined
    });
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  return (
    <>
      <PageHeader title="Bestellung anlegen" />
      <Panel className="purchase-order-new-panel">
        <Tabs label="Erstellmodus" value={mode} onChange={setMode} items={[{ label: "Manuell", value: "manual" }, { label: "Aus Fehlmengen", value: "shortages" }]} />
        {mode === "manual" ? (
          <div className="purchase-order-form">
            <OrderHeaderFields locations={locations.data} locationId={selectedLocationId} notes={notes} onLocationChange={setLocationId} onNotesChange={setNotes} onSupplierChange={setSupplierName} supplierName={supplierName} />
            <section aria-label="Bestellpositionen" className="purchase-order-new-section">
              <div className="purchase-order-new-section-header">
                <div>
                  <h2>Positionen</h2>
                  <p>Artikel, Menge und Konditionen pro Position.</p>
                </div>
                <Button onClick={() => setLines((current) => [...current, emptyLine()])} type="button" variant="secondary"><Plus data-icon="inline-start" />Position hinzufügen</Button>
              </div>
              <div className="purchase-order-lines">
                {lines.map((line, index) => <ManualLine articles={articles.data} index={index} key={index} line={line} onRemove={() => setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index))} onUpdate={(patch) => updateLine(index, patch)} />)}
              </div>
            </section>
            <div className="purchase-order-new-actions"><Button disabled={!canSubmitManual || createManual.isPending} onClick={submitManual} type="button"><Save data-icon="inline-start" />Entwurf anlegen</Button></div>
            {createManual.error ? <InlineError error={createManual.error} /> : null}
          </div>
        ) : (
          <div className="purchase-order-form">
            <OrderHeaderFields locations={locations.data} locationId={selectedLocationId} notes="" onLocationChange={(value) => { setLocationId(value); setShortageArticleIds([]); }} onNotesChange={() => undefined} onSupplierChange={setSupplierName} supplierName={supplierName} />
            <section aria-label="Fehlmengen" className="purchase-order-new-section">
              <div className="purchase-order-new-section-header">
                <div>
                  <h2>Fehlmengen</h2>
                  <p>Bedarf gesammelt oder nach Lieferant gruppieren.</p>
                </div>
              </div>
              <Field label="Gruppierung"><select onChange={(event) => setGroupingMode(event.target.value as "single" | "supplier")} value={groupingMode}><option value="single">Eine Sammelbestellung</option><option value="supplier">Nach Lieferant gruppieren</option></select></Field>
              <div className="purchase-order-lines">
                {shortages.map((target) => <ShortageOption key={target.id} onToggle={(checked) => setShortageArticleIds((current) => checked ? [...current, target.articleId] : current.filter((id) => id !== target.articleId))} selected={shortageArticleIds.includes(target.articleId)} target={target} />)}
                {shortages.length === 0 ? <div className="compact-list-empty">Keine Fehlmengen am ausgewählten Zielort.</div> : null}
              </div>
            </section>
            <div className="purchase-order-new-actions"><Button disabled={!canSubmitShortages || createFromShortages.isPending} onClick={submitShortages} type="button"><Save data-icon="inline-start" />Entwurf anlegen</Button></div>
            {createFromShortages.error ? <InlineError error={createFromShortages.error} /> : null}
          </div>
        )}
      </Panel>
    </>
  );
}

function OrderHeaderFields(props: { locations: Array<{ id: string; name: string }>; locationId: string; notes: string; onLocationChange: (value: string) => void; onNotesChange: (value: string) => void; onSupplierChange: (value: string) => void; supplierName: string }) {
  return <section aria-label="Bestellkopf" className="purchase-order-new-section"><div className="purchase-order-new-section-header"><div><h2>Rahmendaten</h2><p>Lieferant, Zielort und Hinweise für den Entwurf.</p></div></div><div className="form-grid form-grid-three"><Field label="Lieferant"><input onChange={(event) => props.onSupplierChange(event.target.value)} value={props.supplierName} /></Field><Field label="Zielort"><SearchableSelect onChange={props.onLocationChange} options={props.locations.map((location) => ({ label: location.name, value: location.id }))} value={props.locationId} /></Field><Field label="Hinweise"><input onChange={(event) => props.onNotesChange(event.target.value)} value={props.notes} /></Field></div></section>;
}

function ManualLine(props: { articles: Article[]; index: number; line: DraftLine; onRemove: () => void; onUpdate: (patch: Partial<DraftLine>) => void }) {
  return <div className="purchase-order-new-line"><div className="purchase-order-new-line-header"><strong>Position {props.index + 1}</strong><Button aria-label={`Position ${props.index + 1} entfernen`} className="purchase-order-line-remove" onClick={props.onRemove} type="button" variant="ghost"><Trash2 data-icon="inline-start" />Entfernen</Button></div><div className="purchase-order-line-editor"><Field label="Artikel"><SearchableSelect emptyLabel="Artikel wählen" onChange={(value) => props.onUpdate({ articleId: value, price: centsInput(props.articles.find((entry) => entry.id === value)?.defaultGrossPriceCents), supplierArticleNumber: props.articles.find((entry) => entry.id === value)?.manufacturerPartNumber ?? "" })} options={props.articles.map((entry) => ({ label: entry.name, value: entry.id, keywords: [entry.manufacturer ?? "", entry.barcode ?? ""] }))} value={props.line.articleId} /></Field><Field label="Menge"><input min="1" onChange={(event) => props.onUpdate({ quantity: event.target.value })} type="number" value={props.line.quantity} /></Field><Field label="Preis"><input inputMode="decimal" onChange={(event) => props.onUpdate({ price: event.target.value })} value={props.line.price} /></Field><Field label="Art.-Nr."><input onChange={(event) => props.onUpdate({ supplierArticleNumber: event.target.value })} value={props.line.supplierArticleNumber} /></Field><Field label="Notiz"><input onChange={(event) => props.onUpdate({ note: event.target.value })} value={props.line.note} /></Field></div></div>;
}

function ShortageOption(props: { onToggle: (checked: boolean) => void; selected: boolean; target: InventoryTarget }) {
  return <label className="compact-list-row"><span><strong>{props.target.article.name}</strong><small>{props.target.location.name} · Fehlmenge {props.target.shortageQuantity} {props.target.article.unit}</small></span><input checked={props.selected} onChange={(event) => props.onToggle(event.target.checked)} type="checkbox" /></label>;
}

function emptyLine(): DraftLine {
  return { articleId: "", quantity: "1", price: "", note: "", supplierArticleNumber: "" };
}
