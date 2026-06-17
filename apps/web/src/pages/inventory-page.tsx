import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matchesFilterText, toOptionalBoolean, toOptionalString, withPrunedSearch } from "../app/filter-utils";
import { AlertTriangle, Archive, Download } from "lucide-react";
import { daysUntil, toError } from "../app/formatters";
import { ErrorPanel, LoadingPanel, Metric } from "../components/state-panels";
import { AnchorButton } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import { BatchCorrectionPanel } from "./inventory/batch-correction-panel";
import { BatchCreatePanel } from "./inventory/batch-create-panel";
import { BatchListPanel } from "./inventory/batch-list-panel";

export function InventoryPage() {
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
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/admin/inventory" });
  const search = useSearch({ from: "/admin/inventory" });
  const batches = useQuery({ queryKey: ["batches"], queryFn: rescueBaseApi.batches });
  const articles = useQuery({ queryKey: ["articles"], queryFn: rescueBaseApi.articles });
  const locations = useQuery({ queryKey: ["locations"], queryFn: rescueBaseApi.locations });
  const movements = useQuery({ queryKey: ["batch-movements", selectedBatchId], queryFn: () => rescueBaseApi.batchMovements(selectedBatchId ?? ""), enabled: Boolean(selectedBatchId && correctionOpen) });
  const createMutation = useMutation({ mutationFn: rescueBaseApi.createBatch, onSuccess: async () => { setLotNumber(""); setExpiresAt(""); setQuantity(0); setCreateOpen(false); await queryClient.invalidateQueries({ queryKey: ["batches"] }); } });
  const correctionMutation = useMutation({ mutationFn: ({ body, id }: { body: { reason: string; quantity?: number; lotNumber?: string; expiresAt?: string; locationId?: string }; id: string }) => rescueBaseApi.correctBatch(id, body), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["batches"] }), queryClient.invalidateQueries({ queryKey: ["batch-movements", selectedBatchId] })]); setCorrectionReason(""); setCorrectionOpen(false); } });
  const deleteMutation = useMutation({ mutationFn: rescueBaseApi.deleteBatch, onSuccess: async () => { setCorrectionOpen(false); setSelectedBatchId(null); await queryClient.invalidateQueries({ queryKey: ["batches"] }); } });
  const selectedBatch = batches.data?.find((batch) => batch.id === selectedBatchId) ?? null;
  const expiring = batches.data?.filter((batch) => daysUntil(batch.expiresAt) <= 90) ?? [];
  const filters = {
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

  if (batches.isLoading || articles.isLoading || locations.isLoading) return <LoadingPanel label="Lagerbestand wird geladen" />;
  if (batches.isError || articles.isError || locations.isError || !batches.data || !articles.data || !locations.data) return <ErrorPanel error={toError(batches.error ?? articles.error ?? locations.error)} onRetry={() => void Promise.all([batches.refetch(), articles.refetch(), locations.refetch()])} />;

  return (
    <>
      <header className="topbar"><div><h1>Lager</h1><p>Bestand nach Artikel, Lagerort, Charge und Ablaufdatum.</p></div><div className="topbar-actions"><AnchorButton href={rescueBaseApi.reportUrl("/reports/csv/inventory")} variant="secondary"><Download data-icon="inline-start" />CSV Bestand</AnchorButton></div></header>
      <section className="metric-grid metric-grid-compact" aria-label="Lagerkennzahlen"><Metric icon={<Archive />} label="Chargen" tone="info" value={String(batches.data.length)} /><Metric icon={<AlertTriangle />} label="Ablaufwarnungen" tone="danger" value={String(expiring.length)} /></section>
      <BatchListPanel articles={articles.data} batches={filteredBatches} error={deleteMutation.error ? toError(deleteMutation.error) : null} filters={filters} isSubmitting={deleteMutation.isPending} locations={locations.data} onCreate={() => setCreateOpen(true)} onDelete={(id) => deleteMutation.mutate(id)} onFilterChange={updateFilters} onResetFilters={resetFilters} onSelect={(id) => { setSelectedBatchId(id); setCorrectionOpen(true); }} selectedBatchId={selectedBatchId} totalCount={batches.data.length} />
      <BatchCreatePanel articleId={articleId} articles={articles.data} createError={createMutation.error ?? null} expiresAt={expiresAt} isOpen={createOpen} locationId={locationId} locations={locations.data} lotNumber={lotNumber} onArticleChange={setArticleId} onClose={() => setCreateOpen(false)} onCreate={() => createMutation.mutate({ articleId: articleId || articles.data[0]?.id || "", expiresAt, locationId: locationId || locations.data[0]?.id || "", lotNumber, quantity })} onExpiresAtChange={setExpiresAt} onLocationChange={setLocationId} onLotNumberChange={setLotNumber} onQuantityChange={setQuantity} quantity={quantity} />
      <BatchCorrectionPanel correctionError={correctionMutation.error ? toError(correctionMutation.error) : null} correctionExpiresAt={correctionExpiresAt} correctionLocationId={correctionLocationId} correctionLotNumber={correctionLotNumber} correctionQuantity={correctionQuantity} correctionReason={correctionReason} isOpen={correctionOpen} locations={locations.data} movements={movements} onClose={() => setCorrectionOpen(false)} onExpiresAtChange={setCorrectionExpiresAt} onLocationChange={setCorrectionLocationId} onLotNumberChange={setCorrectionLotNumber} onQuantityChange={setCorrectionQuantity} onReasonChange={setCorrectionReason} onSubmit={() => selectedBatch && correctionMutation.mutate({ body: { expiresAt: correctionExpiresAt, locationId: correctionLocationId, lotNumber: correctionLotNumber.trim(), quantity: correctionQuantity, reason: correctionReason }, id: selectedBatch.id })} selectedBatch={selectedBatch} />
    </>
  );
}
