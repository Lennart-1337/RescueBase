import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, Download, History, Plus, Save } from "lucide-react";
import { rescueBaseApi } from "../lib/api";
import type { InventoryMovement } from "../lib/types";
import { AnchorButton, Badge, Button, Field, Panel } from "../components/ui";
import {
  EmptyState,
  ErrorPanel,
  InlineError,
  LoadingPanel,
  Metric,
  daysUntil,
  formatDate,
  formatDateTime,
  formatMovementType,
  toError
} from "../app/shared";

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
  const movements = useQuery({
    queryKey: ["batch-movements", selectedBatchId],
    queryFn: () => rescueBaseApi.batchMovements(selectedBatchId ?? ""),
    enabled: Boolean(selectedBatchId)
  });
  const createMutation = useMutation({
    mutationFn: rescueBaseApi.createBatch,
    onSuccess: async () => {
      setLotNumber("");
      setExpiresAt("");
      setQuantity(0);
      await queryClient.invalidateQueries({ queryKey: ["batches"] });
    }
  });
  const correctionMutation = useMutation({
    mutationFn: ({ body, id }: { body: { reason: string; quantity?: number; lotNumber?: string; expiresAt?: string; locationId?: string }; id: string }) =>
      rescueBaseApi.correctBatch(id, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batches"] }),
        queryClient.invalidateQueries({ queryKey: ["batch-movements", selectedBatchId] })
      ]);
      setCorrectionReason("");
    }
  });
  const selectedArticleId = articleId || articles.data?.[0]?.id || "";
  const selectedLocationId = locationId || locations.data?.[0]?.id || "";
  const canCreate = Boolean(selectedArticleId && selectedLocationId && lotNumber.trim() && expiresAt && quantity >= 0);
  const selectedBatch = batches.data?.find((batch) => batch.id === selectedBatchId) ?? null;
  const hasCorrectionChanges = Boolean(
    selectedBatch &&
      (correctionQuantity !== selectedBatch.quantity ||
        correctionLotNumber.trim() !== selectedBatch.lotNumber ||
        correctionExpiresAt !== selectedBatch.expiresAt ||
        correctionLocationId !== selectedBatch.locationId)
  );

  useEffect(() => {
    if (!selectedBatch) {
      return;
    }
    setCorrectionQuantity(selectedBatch.quantity);
    setCorrectionLotNumber(selectedBatch.lotNumber);
    setCorrectionExpiresAt(selectedBatch.expiresAt);
    setCorrectionLocationId(selectedBatch.locationId);
  }, [selectedBatch]);

  if (batches.isLoading || articles.isLoading || locations.isLoading) {
    return <LoadingPanel label="Lagerbestand wird geladen" />;
  }
  if (batches.isError || articles.isError || locations.isError) {
    return (
      <ErrorPanel
        error={toError(batches.error ?? articles.error ?? locations.error)}
        onRetry={() => void Promise.all([batches.refetch(), articles.refetch(), locations.refetch()])}
      />
    );
  }
  if (!batches.data || !articles.data || !locations.data) {
    return <LoadingPanel label="Lagerbestand wird geladen" />;
  }

  const expiring = batches.data.filter((batch) => daysUntil(batch.expiresAt) <= 90);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Lager</h1>
          <p>Bestand nach Artikel, Lagerort, Charge und Ablaufdatum.</p>
        </div>
        <div className="topbar-actions">
          <AnchorButton href={rescueBaseApi.reportUrl("/reports/csv/inventory")} variant="secondary">
            <Download data-icon="inline-start" />
            CSV Bestand
          </AnchorButton>
        </div>
      </header>
      <section className="metric-grid metric-grid-compact" aria-label="Lagerkennzahlen">
        <Metric icon={<Archive />} label="Chargen" tone="info" value={String(batches.data.length)} />
        <Metric icon={<AlertTriangle />} label="Ablaufwarnungen" tone="danger" value={String(expiring.length)} />
      </section>
      <Panel>
        <div className="panel-header">
          <div>
            <h2>Charge erfassen</h2>
            <p>Neue Bestände werden chargengenau mit Ablaufdatum angelegt.</p>
          </div>
          <Archive />
        </div>
        <div className="form-grid form-grid-five">
          <Field label="Artikel">
            <select value={selectedArticleId} onChange={(event) => setArticleId(event.target.value)}>
              {articles.data.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lagerort">
            <select value={selectedLocationId} onChange={(event) => setLocationId(event.target.value)}>
              {locations.data.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Charge">
            <input value={lotNumber} onChange={(event) => setLotNumber(event.target.value)} />
          </Field>
          <Field label="Ablaufdatum">
            <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </Field>
          <Field label="Menge">
            <input min="0" onChange={(event) => setQuantity(Number(event.target.value))} type="number" value={quantity} />
          </Field>
        </div>
        {createMutation.error ? <InlineError error={createMutation.error} /> : null}
        <div className="form-actions">
          <Button
            disabled={!canCreate || createMutation.isPending}
            onClick={() => createMutation.mutate({ articleId: selectedArticleId, expiresAt, locationId: selectedLocationId, lotNumber, quantity })}
            type="button"
          >
            <Plus data-icon="inline-start" />
            Charge erfassen
          </Button>
        </div>
      </Panel>
      <section className="workbench">
        <Panel>
          <div className="panel-header">
            <div>
              <h2>Bestandschargen</h2>
              <p>Chargen können nur über Korrekturen angepasst werden.</p>
            </div>
            <Badge tone="info">{batches.data.length} erfasst</Badge>
          </div>
          <div className="table">
            {batches.data.map((batch) => (
              <div className="table-row" key={batch.id}>
                <span>
                  <strong>{batch.article.name}</strong>
                  <small>
                    {batch.lotNumber} · {batch.location.name}
                  </small>
                </span>
                <span>
                  {batch.quantity} {batch.article.unit}
                </span>
                <div className="row-actions">
                  <Badge tone={daysUntil(batch.expiresAt) <= 90 ? "danger" : "neutral"}>{formatDate(batch.expiresAt)}</Badge>
                  <Button
                    onClick={() => setSelectedBatchId(batch.id)}
                    type="button"
                    variant={selectedBatchId === batch.id ? "secondary" : "ghost"}
                  >
                    <History data-icon="inline-start" />
                    Korrigieren
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          {selectedBatch ? (
            <>
              <div className="panel-header">
                <div>
                  <h2>Chargenkorrektur</h2>
                  <p>
                    {selectedBatch.article.name} · {selectedBatch.article.unit}
                  </p>
                </div>
                <Archive />
              </div>
              <div className="form-grid form-grid-two">
                <Field label="Charge">
                  <input value={correctionLotNumber} onChange={(event) => setCorrectionLotNumber(event.target.value)} />
                </Field>
                <Field label="Lagerort">
                  <select value={correctionLocationId} onChange={(event) => setCorrectionLocationId(event.target.value)}>
                    {locations.data.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Ablaufdatum">
                  <input type="date" value={correctionExpiresAt} onChange={(event) => setCorrectionExpiresAt(event.target.value)} />
                </Field>
                <Field label="Menge">
                  <input min="0" onChange={(event) => setCorrectionQuantity(Number(event.target.value))} type="number" value={correctionQuantity} />
                </Field>
              </div>
              <div className="template-form">
                <Field label="Begründung">
                  <textarea onChange={(event) => setCorrectionReason(event.target.value)} rows={3} value={correctionReason} />
                </Field>
              </div>
              {correctionMutation.error ? <InlineError error={toError(correctionMutation.error)} /> : null}
              <div className="form-actions">
                <Button
                  disabled={!hasCorrectionChanges || !correctionReason.trim() || correctionMutation.isPending}
                  onClick={() =>
                    correctionMutation.mutate({
                      body: {
                        expiresAt: correctionExpiresAt,
                        locationId: correctionLocationId,
                        lotNumber: correctionLotNumber.trim(),
                        quantity: correctionQuantity,
                        reason: correctionReason
                      },
                      id: selectedBatch.id
                    })
                  }
                  type="button"
                >
                  <Save data-icon="inline-start" />
                  Korrektur buchen
                </Button>
              </div>
              <div className="panel-header panel-subheader">
                <div>
                  <h2>Historie</h2>
                  <p>Bewegungen und Korrekturen dieser Charge.</p>
                </div>
              </div>
              {movements.isLoading ? <LoadingPanel label="Historie wird geladen" /> : null}
              {movements.isError ? <InlineError error={toError(movements.error)} /> : null}
              {movements.data ? (
                <div className="compact-list">
                  {movements.data.map((movement: InventoryMovement) => (
                    <div className="compact-list-row compact-list-row-actions" key={movement.id}>
                      <span>
                        <strong>{formatMovementType(movement.type)}</strong>
                        <small>
                          {formatDateTime(movement.createdAt)} · {movement.actorLabel}
                          {movement.reason ? ` · ${movement.reason}` : ""}
                        </small>
                      </span>
                      <Badge tone={movement.quantity < 0 ? "warning" : movement.quantity > 0 ? "ready" : "info"}>
                        {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState text="Wählen Sie links eine Charge aus, um sie nachvollziehbar zu korrigieren." title="Keine Charge ausgewählt" />
          )}
        </Panel>
      </section>
    </>
  );
}
