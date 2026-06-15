import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [correctionQuantity, setCorrectionQuantity] = useState(0);
  const [correctionLotNumber, setCorrectionLotNumber] = useState("");
  const [correctionExpiresAt, setCorrectionExpiresAt] = useState("");
  const [correctionLocationId, setCorrectionLocationId] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const queryClient = useQueryClient();
  const batches = useQuery({ queryKey: ["batches"], queryFn: rescueBaseApi.batches });
  const articles = useQuery({ queryKey: ["articles"], queryFn: rescueBaseApi.articles });
  const locations = useQuery({ queryKey: ["locations"], queryFn: rescueBaseApi.locations });
  const movements = useQuery({ queryKey: ["batch-movements", selectedBatchId], queryFn: () => rescueBaseApi.batchMovements(selectedBatchId ?? ""), enabled: Boolean(selectedBatchId) });
  const createMutation = useMutation({ mutationFn: rescueBaseApi.createBatch, onSuccess: async () => { setLotNumber(""); setExpiresAt(""); setQuantity(0); await queryClient.invalidateQueries({ queryKey: ["batches"] }); } });
  const correctionMutation = useMutation({
    mutationFn: ({ body, id }: { body: { reason: string; quantity?: number; lotNumber?: string; expiresAt?: string; locationId?: string }; id: string }) => rescueBaseApi.correctBatch(id, body),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["batches"] }), queryClient.invalidateQueries({ queryKey: ["batch-movements", selectedBatchId] })]); setCorrectionReason(""); }
  });
  const selectedBatch = batches.data?.find((batch) => batch.id === selectedBatchId) ?? null;
  const expiring = batches.data?.filter((batch) => daysUntil(batch.expiresAt) <= 90) ?? [];

  useEffect(() => {
    if (!selectedBatch) return;
    setCorrectionQuantity(selectedBatch.quantity);
    setCorrectionLotNumber(selectedBatch.lotNumber);
    setCorrectionExpiresAt(selectedBatch.expiresAt);
    setCorrectionLocationId(selectedBatch.locationId);
  }, [selectedBatch]);

  if (batches.isLoading || articles.isLoading || locations.isLoading) return <LoadingPanel label="Lagerbestand wird geladen" />;
  if (batches.isError || articles.isError || locations.isError || !batches.data || !articles.data || !locations.data) return <ErrorPanel error={toError(batches.error ?? articles.error ?? locations.error)} onRetry={() => void Promise.all([batches.refetch(), articles.refetch(), locations.refetch()])} />;

  return (
    <>
      <header className="topbar"><div><h1>Lager</h1><p>Bestand nach Artikel, Lagerort, Charge und Ablaufdatum.</p></div><div className="topbar-actions"><AnchorButton href={rescueBaseApi.reportUrl("/reports/csv/inventory")} variant="secondary"><Download data-icon="inline-start" />CSV Bestand</AnchorButton></div></header>
      <section className="metric-grid metric-grid-compact" aria-label="Lagerkennzahlen"><Metric icon={<Archive />} label="Chargen" tone="info" value={String(batches.data.length)} /><Metric icon={<AlertTriangle />} label="Ablaufwarnungen" tone="danger" value={String(expiring.length)} /></section>
      <BatchCreatePanel articleId={articleId} articles={articles.data} createError={createMutation.error ?? null} expiresAt={expiresAt} locationId={locationId} locations={locations.data} lotNumber={lotNumber} onArticleChange={setArticleId} onCreate={() => createMutation.mutate({ articleId: articleId || articles.data[0]?.id || "", expiresAt, locationId: locationId || locations.data[0]?.id || "", lotNumber, quantity })} onExpiresAtChange={setExpiresAt} onLocationChange={setLocationId} onLotNumberChange={setLotNumber} onQuantityChange={setQuantity} quantity={quantity} />
      <section className="workbench">
        <BatchListPanel batches={batches.data} onSelect={setSelectedBatchId} selectedBatchId={selectedBatchId} />
        <BatchCorrectionPanel correctionError={correctionMutation.error ? toError(correctionMutation.error) : null} correctionExpiresAt={correctionExpiresAt} correctionLocationId={correctionLocationId} correctionLotNumber={correctionLotNumber} correctionQuantity={correctionQuantity} correctionReason={correctionReason} locations={locations.data} movements={movements} onExpiresAtChange={setCorrectionExpiresAt} onLocationChange={setCorrectionLocationId} onLotNumberChange={setCorrectionLotNumber} onQuantityChange={setCorrectionQuantity} onReasonChange={setCorrectionReason} onSubmit={() => selectedBatch && correctionMutation.mutate({ body: { expiresAt: correctionExpiresAt, locationId: correctionLocationId, lotNumber: correctionLotNumber.trim(), quantity: correctionQuantity, reason: correctionReason }, id: selectedBatch.id })} selectedBatch={selectedBatch} />
      </section>
    </>
  );
}
