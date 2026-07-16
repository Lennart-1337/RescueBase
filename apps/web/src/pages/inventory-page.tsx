import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matchesFilterText, toOptionalBoolean, toOptionalString, withPrunedSearch } from "../app/filter-utils";
import { AlertTriangle, Archive, Download, Plus, ShoppingCart } from "lucide-react";
import { daysUntil, toError } from "../app/formatters";
import { ErrorPanel, LoadingPanel, MetricGrid } from "../components/state-panels";
import { PageHeader, PageToolbar, Workspace, WorkspaceMain, WorkspaceRail } from "../components/page-layout";
import { AnchorButton, Button, Tabs } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser, InventoryTarget } from "../lib/types";
import { catalogQueries } from "../queries/catalog";
import { invalidateInventoryPlanning, inventoryKeys, inventoryQueries } from "../queries/inventory";
import { BatchCorrectionPanel } from "./inventory/batch-correction-panel";
import { BatchCreatePanel } from "./inventory/batch-create-panel";
import { BatchListPanel } from "./inventory/batch-list-panel";
import { InventoryFilterToolbar } from "./inventory/inventory-filter-toolbar";
import { clampPage, INVENTORY_LIST_PAGE_SIZE, paginateItems } from "./inventory/pagination";
import { TargetDialog } from "./inventory/target-dialog";
import { TargetPanel } from "./inventory/target-panel";
import type { InventoryFilters, TargetDraft } from "./inventory/types";
import "./inventory-page.css";

export function InventoryPage({ user: _user }: { user: AuthenticatedUser }) {
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
  const [batchPage, setBatchPage] = useState(1);
  const [targetPage, setTargetPage] = useState(1);
  const [batchPageSize, setBatchPageSize] = useState(INVENTORY_LIST_PAGE_SIZE);
  const [targetPageSize, setTargetPageSize] = useState(INVENTORY_LIST_PAGE_SIZE);
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/admin/inventory" });
  const search = useSearch({ from: "/admin/inventory" });
  const currentView = search.view === "targets" ? "targets" : "stock";
  const batches = useQuery(inventoryQueries.batches());
  const articles = useQuery(catalogQueries.articles());
  const locations = useQuery(catalogQueries.locations());
  const targets = useQuery(inventoryQueries.targets());
  const movements = useQuery(inventoryQueries.batchMovements(selectedBatchId, Boolean(selectedBatchId && correctionOpen)));
  const createMutation = useMutation({ mutationFn: rescueBaseApi.createBatch, onSuccess: async () => { setLotNumber(""); setExpiresAt(""); setQuantity(0); setCreateOpen(false); await invalidateInventoryPlanning(queryClient); } });
  const correctionMutation = useMutation({ mutationFn: ({ body, id }: { body: { reason: string; quantity?: number; lotNumber?: string; expiresAt?: string; locationId?: string }; id: string }) => rescueBaseApi.correctBatch(id, body), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: inventoryKeys.batches() }), queryClient.invalidateQueries({ queryKey: inventoryKeys.batchMovements(selectedBatchId) })]); setCorrectionReason(""); setCorrectionOpen(false); } });
  const deleteMutation = useMutation({ mutationFn: rescueBaseApi.deleteBatch, onSuccess: async () => { setCorrectionOpen(false); setSelectedBatchId(null); await invalidateInventoryPlanning(queryClient); } });
  const targetMutation = useMutation({ mutationFn: ({ draft }: { draft: TargetDraft }) => rescueBaseApi.upsertInventoryTarget(draft.articleId, draft.locationId, { targetQuantity: Number(draft.targetQuantity) }), onSuccess: async () => { setTargetOpen(false); await queryClient.invalidateQueries({ queryKey: inventoryKeys.targets() }); } });
  const clearTargetMutation = useMutation({ mutationFn: ({ articleId, locationId }: { articleId: string; locationId: string }) => rescueBaseApi.clearInventoryTarget(articleId, locationId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: inventoryKeys.targets() }); } });
  const selectedBatch = batches.data?.find((batch) => batch.id === selectedBatchId) ?? null;
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

  const filteredBatches = (batches.data ?? []).filter((batch) => {
    if (!filters.showEmpty && batch.quantity === 0) return false;
    if (filters.locationId && batch.location.id !== filters.locationId) return false;
    if (filters.articleId && batch.article.id !== filters.articleId) return false;
    return matchesFilterText(filters.q, batch.article.name, batch.lotNumber);
  });
  const filteredTargets = (targets.data ?? []).filter((target) => matchesInventoryFilters(filters, target.articleId, target.locationId, target.article.name, target.location.name));
  const pagedBatches = paginateItems(filteredBatches, batchPage, batchPageSize);
  const pagedTargets = paginateItems(filteredTargets, targetPage, targetPageSize);

  useEffect(() => {
    if (!selectedBatchId) return;
    if (!filteredBatches.some((batch) => batch.id === selectedBatchId)) {
      setSelectedBatchId(null);
      setCorrectionOpen(false);
    }
  }, [filteredBatches, selectedBatchId]);

  useEffect(() => {
    setBatchPage(1);
    setTargetPage(1);
  }, [filters.articleId, filters.locationId, filters.q, filters.showEmpty]);

  useEffect(() => {
    setBatchPage((page) => clampPage(page, filteredBatches.length, batchPageSize));
  }, [batchPageSize, filteredBatches.length]);

  useEffect(() => {
    setTargetPage((page) => clampPage(page, filteredTargets.length, targetPageSize));
  }, [filteredTargets.length, targetPageSize]);

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

  function changeView(view: string) {
    void navigate({ replace: true, search: (current) => ({ ...current, view: view === "targets" ? "targets" : undefined }) });
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

  if (batches.isLoading || articles.isLoading || locations.isLoading || targets.isLoading) return <LoadingPanel label="Lagerbestand wird geladen" />;
  if (batches.isError || articles.isError || locations.isError || targets.isError || !batches.data || !articles.data || !locations.data || !targets.data) {
    return <ErrorPanel error={toError(batches.error ?? articles.error ?? locations.error ?? targets.error)} onRetry={() => void Promise.all([batches.refetch(), articles.refetch(), locations.refetch(), targets.refetch()])} />;
  }

  return (
    <>
      <PageHeader actions={<><Link className="button button-secondary" search={{ mode: "shortages" }} to="/admin/purchase-orders/new"><ShoppingCart data-icon="inline-start" />Bestellung aus Fehlmengen</Link><AnchorButton href={rescueBaseApi.reportUrl("/reports/csv/inventory")} variant="secondary"><Download data-icon="inline-start" />CSV Bestand</AnchorButton><Button onClick={() => setCreateOpen(true)} type="button"><Plus data-icon="inline-start" />Charge hinzufügen</Button></>} className="inventory-page-header" title="Lager" />
      <Tabs items={[{ label: "Bestand", value: "stock" }, { label: "Sollbestände", value: "targets" }]} label="Lageransichten" onChange={changeView} value={currentView} />
      <MetricGrid compact items={[
        { icon: <Archive />, label: "Chargen", tone: "info", value: String(batches.data.length) },
        { icon: <AlertTriangle />, label: "Ablaufwarnungen", tone: "danger", value: String(expiring.length) }
      ]} label="Lagerkennzahlen" />
      <PageToolbar label="Bestand filtern"><InventoryFilterToolbar articles={articles.data} countLabel={currentView === "targets" ? `${filteredTargets.length}/${targets.data.length} Sollbestände sichtbar` : `${filteredBatches.length}/${batches.data.length} Chargen sichtbar`} filters={filters} locations={locations.data} onChange={updateFilters} onReset={resetFilters} /></PageToolbar>
      {currentView === "targets" ? <Workspace className="inventory-workspace inventory-targets-workspace"><WorkspaceMain label="Sollbestände"><TargetPanel error={targetMutation.error || clearTargetMutation.error ? toError(targetMutation.error ?? clearTargetMutation.error) : null} filteredCount={filteredTargets.length} isSubmitting={targetMutation.isPending || clearTargetMutation.isPending} onClear={clearTarget} onCreate={openCreateTarget} onEdit={openEditTarget} onPageChange={setTargetPage} onPageSizeChange={(pageSize) => { setTargetPageSize(pageSize); setTargetPage(1); }} page={targetPage} pageSize={targetPageSize} pageSizeOptions={INVENTORY_PAGE_SIZE_OPTIONS} targets={pagedTargets} totalCount={targets.data.length} /></WorkspaceMain></Workspace> : <Workspace className="inventory-workspace"><WorkspaceMain label="Bestandschargen"><BatchListPanel batches={pagedBatches} error={deleteMutation.error ? toError(deleteMutation.error) : null} filteredCount={filteredBatches.length} isSubmitting={deleteMutation.isPending} onDelete={(id) => deleteMutation.mutate(id)} onPageChange={setBatchPage} onPageSizeChange={(pageSize) => { setBatchPageSize(pageSize); setBatchPage(1); }} onSelect={(id) => { setSelectedBatchId(id); setCorrectionOpen(true); }} page={batchPage} pageSize={batchPageSize} pageSizeOptions={INVENTORY_PAGE_SIZE_OPTIONS} selectedBatchId={selectedBatchId} totalCount={batches.data.length} /></WorkspaceMain></Workspace>}
      <TargetDialog articles={articles.data} draft={targetDraft} error={targetMutation.error ? toError(targetMutation.error) : null} isOpen={targetOpen} isSubmitting={targetMutation.isPending} locations={locations.data} onChange={setTargetDraft} onClose={() => setTargetOpen(false)} onSubmit={() => targetMutation.mutate({ draft: targetDraft })} />
      <BatchCreatePanel articleId={articleId} articles={articles.data} createError={createMutation.error ?? null} expiresAt={expiresAt} isOpen={createOpen} isSubmitting={createMutation.isPending} locationId={locationId} locations={locations.data} lotNumber={lotNumber} onArticleChange={setArticleId} onClose={() => setCreateOpen(false)} onCreate={() => createMutation.mutate({ articleId: articleId || articles.data[0]?.id || "", expiresAt, locationId: locationId || locations.data[0]?.id || "", lotNumber, quantity })} onExpiresAtChange={setExpiresAt} onLocationChange={setLocationId} onLotNumberChange={setLotNumber} onQuantityChange={setQuantity} quantity={quantity} />
      <BatchCorrectionPanel correctionError={correctionMutation.error ? toError(correctionMutation.error) : null} correctionExpiresAt={correctionExpiresAt} correctionLocationId={correctionLocationId} correctionLotNumber={correctionLotNumber} correctionQuantity={correctionQuantity} correctionReason={correctionReason} isOpen={correctionOpen} isSubmitting={correctionMutation.isPending} locations={locations.data} movements={movements} onClose={() => setCorrectionOpen(false)} onExpiresAtChange={setCorrectionExpiresAt} onLocationChange={setCorrectionLocationId} onLotNumberChange={setCorrectionLotNumber} onQuantityChange={setCorrectionQuantity} onReasonChange={setCorrectionReason} onSubmit={() => selectedBatch && correctionMutation.mutate({ body: { expiresAt: correctionExpiresAt, locationId: correctionLocationId, lotNumber: correctionLotNumber.trim(), quantity: correctionQuantity, reason: correctionReason }, id: selectedBatch.id })} selectedBatch={selectedBatch} />
    </>
  );
}

function matchesInventoryFilters(filters: InventoryFilters, articleId: string, locationId: string, ...text: string[]) {
  if (filters.articleId && articleId !== filters.articleId) return false;
  if (filters.locationId && locationId !== filters.locationId) return false;
  return matchesFilterText(filters.q, ...text);
}

const INVENTORY_PAGE_SIZE_OPTIONS = [10, 25, 50];
