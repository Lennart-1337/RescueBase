import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matchesFilterText, toOptionalBoolean, toOptionalString, withPrunedSearch } from "../app/filter-utils";
import { AlertTriangle, Archive, Download, Plus } from "lucide-react";
import { daysUntil, toError } from "../app/formatters";
import { ErrorPanel, LoadingPanel, Metric } from "../components/state-panels";
import { PageHeader, PageToolbar, Workspace, WorkspaceMain, WorkspaceRail } from "../components/page-layout";
import { AnchorButton, Button } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser, InventoryProcurementOrder, InventoryTarget } from "../lib/types";
import { AutomationPanel } from "./inventory/automation-panel";
import { BatchCorrectionPanel } from "./inventory/batch-correction-panel";
import { BatchCreatePanel } from "./inventory/batch-create-panel";
import { BatchListPanel } from "./inventory/batch-list-panel";
import { InventoryFilterToolbar } from "./inventory/inventory-filter-toolbar";
import { ProcurementOrderPanel } from "./inventory/procurement-order-panel";
import { ProcurementReceiveDialog } from "./inventory/procurement-receive-dialog";
import { TargetDialog } from "./inventory/target-dialog";
import { TargetPanel } from "./inventory/target-panel";
import type { InventoryFilters, ReceiptDraftItem, TargetDraft } from "./inventory/types";

export function InventoryPage({ user }: { user: AuthenticatedUser }) {
  const [articleId, setArticleId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [correctionQuantity, setCorrectionQuantity] = useState(0);
  const [correctionLotNumber, setCorrectionLotNumber] = useState("");
  const [correctionExpiresAt, setCorrectionExpiresAt] = useState("");
  const [correctionLocationId, setCorrectionLocationId] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetDraft, setTargetDraft] = useState<TargetDraft>({ articleId: "", locationId: "", targetQuantity: "" });
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveOrderId, setReceiveOrderId] = useState("");
  const [receiptItems, setReceiptItems] = useState<ReceiptDraftItem[]>([emptyReceiptItem()]);
  const [receiptVerified, setReceiptVerified] = useState(false);
  const [automationTime, setAutomationTime] = useState("02:00");
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/admin/inventory" });
  const search = useSearch({ from: "/admin/inventory" });
  const batches = useQuery({ queryKey: ["batches"], queryFn: rescueBaseApi.batches });
  const articles = useQuery({ queryKey: ["articles"], queryFn: rescueBaseApi.articles });
  const locations = useQuery({ queryKey: ["locations"], queryFn: rescueBaseApi.locations });
  const targets = useQuery({ queryKey: ["inventory-targets"], queryFn: rescueBaseApi.inventoryTargets });
  const procurementOrders = useQuery({ queryKey: ["inventory-procurement-orders"], queryFn: rescueBaseApi.procurementOrders });
  const automationConfig = useQuery({ queryKey: ["inventory-automation-config"], queryFn: rescueBaseApi.inventoryAutomationConfig, enabled: user.role === "ADMIN" });
  const movements = useQuery({ queryKey: ["batch-movements", selectedBatchId], queryFn: () => rescueBaseApi.batchMovements(selectedBatchId ?? ""), enabled: Boolean(selectedBatchId && correctionOpen) });
  const createMutation = useMutation({ mutationFn: rescueBaseApi.createBatch, onSuccess: async () => { setLotNumber(""); setExpiresAt(""); setQuantity(0); setCreateOpen(false); await invalidateInventoryPlanning(); } });
  const correctionMutation = useMutation({ mutationFn: ({ body, id }: { body: { reason: string; quantity?: number; lotNumber?: string; expiresAt?: string; locationId?: string }; id: string }) => rescueBaseApi.correctBatch(id, body), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["batches"] }), queryClient.invalidateQueries({ queryKey: ["batch-movements", selectedBatchId] })]); setCorrectionReason(""); setCorrectionOpen(false); } });
  const deleteMutation = useMutation({ mutationFn: rescueBaseApi.deleteBatch, onSuccess: async () => { setCorrectionOpen(false); setSelectedBatchId(null); await invalidateInventoryPlanning(); } });
  const targetMutation = useMutation({ mutationFn: ({ draft }: { draft: TargetDraft }) => rescueBaseApi.upsertInventoryTarget(draft.articleId, draft.locationId, { targetQuantity: Number(draft.targetQuantity) }), onSuccess: async () => { setTargetOpen(false); await queryClient.invalidateQueries({ queryKey: ["inventory-targets"] }); } });
  const clearTargetMutation = useMutation({ mutationFn: ({ articleId, locationId }: { articleId: string; locationId: string }) => rescueBaseApi.clearInventoryTarget(articleId, locationId), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["inventory-targets"] }), queryClient.invalidateQueries({ queryKey: ["inventory-procurement-orders"] })]); } });
  const startOrderMutation = useMutation({ mutationFn: rescueBaseApi.startProcurementOrder, onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["inventory-targets"] }), queryClient.invalidateQueries({ queryKey: ["inventory-procurement-orders"] })]); } });
  const cancelOrderMutation = useMutation({ mutationFn: rescueBaseApi.cancelProcurementOrder, onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["inventory-targets"] }), queryClient.invalidateQueries({ queryKey: ["inventory-procurement-orders"] })]); } });
  const receiveOrderMutation = useMutation({ mutationFn: ({ id, items, verified }: { id: string; items: ReceiptDraftItem[]; verified: boolean }) => rescueBaseApi.receiveProcurementOrder(id, { items: items.map((item) => ({ expiresAt: item.expiresAt, lotNumber: item.lotNumber, quantity: Number(item.quantity) })), verified }), onSuccess: async () => { setReceiveOpen(false); setReceiptVerified(false); await invalidateInventoryPlanning(); } });
  const reconcileMutation = useMutation({ mutationFn: rescueBaseApi.reconcileInventoryTargets, onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["inventory-targets"] }), queryClient.invalidateQueries({ queryKey: ["inventory-procurement-orders"] }), queryClient.invalidateQueries({ queryKey: ["inventory-automation-config"] })]); } });
  const automationMutation = useMutation({ mutationFn: rescueBaseApi.updateInventoryAutomationConfig, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["inventory-automation-config"] }); } });
  const selectedBatch = batches.data?.find((batch) => batch.id === selectedBatchId) ?? null;
  const selectedReceiveOrder = procurementOrders.data?.find((order) => order.id === receiveOrderId) ?? null;
  const expiring = batches.data?.filter((batch) => daysUntil(batch.expiresAt) <= 90) ?? [];
  const filters: InventoryFilters = {
    articleId: search.articleId ?? "",
    locationId: search.locationId ?? "",
    q: search.q ?? "",
    showEmpty: search.showEmpty === true
  };

  useEffect(() => {
    if (!selectedBatch) return;
    setCorrectionQuantity(selectedBatch.quantity);
    setCorrectionLotNumber(selectedBatch.lotNumber);
    setCorrectionExpiresAt(selectedBatch.expiresAt);
    setCorrectionLocationId(selectedBatch.locationId);
  }, [selectedBatch]);

  useEffect(() => {
    if (automationConfig.data?.dailyReconcileTime) setAutomationTime(automationConfig.data.dailyReconcileTime);
  }, [automationConfig.data?.dailyReconcileTime]);

  const filteredBatches = (batches.data ?? []).filter((batch) => {
    if (!filters.showEmpty && batch.quantity === 0) return false;
    if (filters.locationId && batch.location.id !== filters.locationId) return false;
    if (filters.articleId && batch.article.id !== filters.articleId) return false;
    return matchesFilterText(filters.q, batch.article.name, batch.lotNumber);
  });
  const filteredTargets = (targets.data ?? []).filter((target) => matchesInventoryFilters(filters, target.articleId, target.locationId, target.article.name, target.location.name));
  const filteredProcurementOrders = (procurementOrders.data ?? []).filter((order) => matchesInventoryFilters(filters, order.articleId, order.locationId, order.article.name, order.location.name, order.id, ...order.receipts.map((receipt) => receipt.lotNumber)));
  const procurementPdfHref = rescueBaseApi.reportUrl(`/reports/procurement.pdf${toProcurementPdfSearch(filters)}`);

  useEffect(() => {
    if (!selectedBatchId) return;
    if (!filteredBatches.some((batch) => batch.id === selectedBatchId)) {
      setSelectedBatchId(null);
      setCorrectionOpen(false);
    }
  }, [filteredBatches, selectedBatchId]);

  function updateFilters(patch: Partial<typeof filters>) {
    void navigate({
      replace: true,
      search: (current) => withPrunedSearch({
        ...current,
        articleId: toOptionalString(patch.articleId ?? filters.articleId),
        locationId: toOptionalString(patch.locationId ?? filters.locationId),
        q: toOptionalString(patch.q ?? filters.q),
        showEmpty: toOptionalBoolean(patch.showEmpty ?? filters.showEmpty)
      })
    });
  }

  function resetFilters() {
    void navigate({
      replace: true,
      search: () => ({})
    });
  }

  async function invalidateInventoryPlanning() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["batches"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-targets"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-procurement-orders"] })
    ]);
  }

  function openCreateTarget() {
    setTargetDraft({
      articleId: filters.articleId || articles.data?.[0]?.id || "",
      locationId: filters.locationId || locations.data?.[0]?.id || "",
      targetQuantity: ""
    });
    setTargetOpen(true);
  }

  function openEditTarget(target: InventoryTarget) {
    setTargetDraft({ articleId: target.articleId, locationId: target.locationId, targetQuantity: String(target.targetQuantity) });
    setTargetOpen(true);
  }

  function clearTarget(target: InventoryTarget) {
    if (window.confirm(`Soll für "${target.article.name}" in "${target.location.name}" löschen?`)) {
      clearTargetMutation.mutate({ articleId: target.articleId, locationId: target.locationId });
    }
  }

  function openReceive(order: InventoryProcurementOrder) {
    setReceiveOrderId(order.id);
    setReceiptItems([{ ...emptyReceiptItem(), quantity: String(order.remainingQuantity) }]);
    setReceiptVerified(false);
    setReceiveOpen(true);
  }

  const isAdminLoading = user.role === "ADMIN" && automationConfig.isLoading;
  const isAdminError = user.role === "ADMIN" && automationConfig.isError;
  if (batches.isLoading || articles.isLoading || locations.isLoading || targets.isLoading || procurementOrders.isLoading || isAdminLoading) return <LoadingPanel label="Lagerbestand wird geladen" />;
  if (batches.isError || articles.isError || locations.isError || targets.isError || procurementOrders.isError || isAdminError || !batches.data || !articles.data || !locations.data || !targets.data || !procurementOrders.data) {
    return <ErrorPanel error={toError(batches.error ?? articles.error ?? locations.error ?? targets.error ?? procurementOrders.error ?? automationConfig.error)} onRetry={() => void Promise.all([batches.refetch(), articles.refetch(), locations.refetch(), targets.refetch(), procurementOrders.refetch(), user.role === "ADMIN" ? automationConfig.refetch() : Promise.resolve()])} />;
  }

  return (
    <>
      <PageHeader actions={<><AnchorButton href={rescueBaseApi.reportUrl("/reports/csv/inventory")} variant="secondary"><Download data-icon="inline-start" />CSV Bestand</AnchorButton><Button onClick={() => setCreateOpen(true)} type="button"><Plus data-icon="inline-start" />Charge hinzufügen</Button></>} description="Bestand, Sollmengen und Beschaffung nach Standort." title="Lager" />
      <section className="metric-grid metric-grid-compact" aria-label="Lagerkennzahlen"><Metric icon={<Archive />} label="Chargen" tone="info" value={String(batches.data.length)} /><Metric icon={<AlertTriangle />} label="Ablaufwarnungen" tone="danger" value={String(expiring.length)} /></section>
      {user.role === "ADMIN" && automationConfig.data ? <AutomationPanel config={automationConfig.data} error={reconcileMutation.error || automationMutation.error ? toError(reconcileMutation.error ?? automationMutation.error) : null} isReconciling={reconcileMutation.isPending} isSaving={automationMutation.isPending} onReconcile={() => reconcileMutation.mutate()} onSave={() => automationMutation.mutate({ dailyReconcileTime: automationTime })} onTimeChange={setAutomationTime} time={automationTime} /> : null}
      <PageToolbar label="Bestand filtern"><InventoryFilterToolbar articles={articles.data} countLabel={`${filteredBatches.length}/${batches.data.length} Chargen sichtbar`} filters={filters} locations={locations.data} onChange={updateFilters} onReset={resetFilters} /></PageToolbar>
      <Workspace className="inventory-workspace">
        <WorkspaceMain label="Bestandschargen"><BatchListPanel batches={filteredBatches} error={deleteMutation.error ? toError(deleteMutation.error) : null} isSubmitting={deleteMutation.isPending} onDelete={(id) => deleteMutation.mutate(id)} onSelect={(id) => { setSelectedBatchId(id); setCorrectionOpen(true); }} selectedBatchId={selectedBatchId} totalCount={batches.data.length} /></WorkspaceMain>
        <WorkspaceRail label="Bestandsplanung"><TargetPanel error={targetMutation.error || clearTargetMutation.error ? toError(targetMutation.error ?? clearTargetMutation.error) : null} isSubmitting={targetMutation.isPending || clearTargetMutation.isPending} onClear={clearTarget} onCreate={openCreateTarget} onEdit={openEditTarget} targets={filteredTargets} totalCount={targets.data.length} /><ProcurementOrderPanel error={startOrderMutation.error || cancelOrderMutation.error ? toError(startOrderMutation.error ?? cancelOrderMutation.error) : null} isSubmitting={startOrderMutation.isPending || cancelOrderMutation.isPending || receiveOrderMutation.isPending} onCancel={(order) => cancelOrderMutation.mutate(order.id)} onReceive={openReceive} onStart={(order) => startOrderMutation.mutate(order.id)} orders={filteredProcurementOrders} pdfHref={procurementPdfHref} totalCount={procurementOrders.data.length} /></WorkspaceRail>
      </Workspace>
      <TargetDialog articles={articles.data} draft={targetDraft} error={targetMutation.error ? toError(targetMutation.error) : null} isOpen={targetOpen} isSubmitting={targetMutation.isPending} locations={locations.data} onChange={setTargetDraft} onClose={() => setTargetOpen(false)} onSubmit={() => targetMutation.mutate({ draft: targetDraft })} />
      <ProcurementReceiveDialog draftItems={receiptItems} error={receiveOrderMutation.error ? toError(receiveOrderMutation.error) : null} isOpen={receiveOpen} isSubmitting={receiveOrderMutation.isPending} onAddItem={() => setReceiptItems((items) => [...items, emptyReceiptItem()])} onChangeItem={(index, item) => setReceiptItems((items) => items.map((entry, entryIndex) => entryIndex === index ? item : entry))} onClose={() => setReceiveOpen(false)} onRemoveItem={(index) => setReceiptItems((items) => items.length === 1 ? items : items.filter((_, entryIndex) => entryIndex !== index))} onSubmit={() => selectedReceiveOrder && receiveOrderMutation.mutate({ id: selectedReceiveOrder.id, items: receiptItems, verified: receiptVerified })} onVerifiedChange={setReceiptVerified} order={selectedReceiveOrder} verified={receiptVerified} />
      <BatchCreatePanel articleId={articleId} articles={articles.data} createError={createMutation.error ?? null} expiresAt={expiresAt} isOpen={createOpen} locationId={locationId} locations={locations.data} lotNumber={lotNumber} onArticleChange={setArticleId} onClose={() => setCreateOpen(false)} onCreate={() => createMutation.mutate({ articleId: articleId || articles.data[0]?.id || "", expiresAt, locationId: locationId || locations.data[0]?.id || "", lotNumber, quantity })} onExpiresAtChange={setExpiresAt} onLocationChange={setLocationId} onLotNumberChange={setLotNumber} onQuantityChange={setQuantity} quantity={quantity} />
      <BatchCorrectionPanel correctionError={correctionMutation.error ? toError(correctionMutation.error) : null} correctionExpiresAt={correctionExpiresAt} correctionLocationId={correctionLocationId} correctionLotNumber={correctionLotNumber} correctionQuantity={correctionQuantity} correctionReason={correctionReason} isOpen={correctionOpen} locations={locations.data} movements={movements} onClose={() => setCorrectionOpen(false)} onExpiresAtChange={setCorrectionExpiresAt} onLocationChange={setCorrectionLocationId} onLotNumberChange={setCorrectionLotNumber} onQuantityChange={setCorrectionQuantity} onReasonChange={setCorrectionReason} onSubmit={() => selectedBatch && correctionMutation.mutate({ body: { expiresAt: correctionExpiresAt, locationId: correctionLocationId, lotNumber: correctionLotNumber.trim(), quantity: correctionQuantity, reason: correctionReason }, id: selectedBatch.id })} selectedBatch={selectedBatch} />
    </>
  );
}

function matchesInventoryFilters(filters: InventoryFilters, articleId: string, locationId: string, ...text: string[]) {
  if (filters.articleId && articleId !== filters.articleId) return false;
  if (filters.locationId && locationId !== filters.locationId) return false;
  return matchesFilterText(filters.q, ...text);
}

function emptyReceiptItem(): ReceiptDraftItem {
  return { expiresAt: "", lotNumber: "", quantity: "" };
}

function toProcurementPdfSearch(filters: InventoryFilters) {
  const params = new URLSearchParams();
  if (filters.articleId) params.set("articleId", filters.articleId);
  if (filters.locationId) params.set("locationId", filters.locationId);
  if (filters.q) params.set("q", filters.q);
  const query = params.toString();
  return query ? `?${query}` : "";
}
