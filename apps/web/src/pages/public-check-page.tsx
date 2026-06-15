import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { rescueBaseApi } from "../lib/api";
import { groupTemplatePositions, initialCheckLines, summarizeCheck, type CheckLineState } from "../lib/check";
import type { KitOperationalStatus, PublicKitResponse, ReplenishmentOrder } from "../lib/types";
import { Badge, Button, Field, Panel } from "../components/ui";
import { ErrorPanel, InlineError, statusLabels, toError } from "../app/shared";
import { Stepper } from "../components/stepper";

export function PublicCheck({ token }: { token: string }) {
  const query = useQuery({ queryKey: ["public-kit", token], queryFn: () => rescueBaseApi.publicKit(token) });
  const mutation = useMutation({ mutationFn: (body: Parameters<typeof rescueBaseApi.completeCheck>[1]) => rescueBaseApi.completeCheck(token, body) });

  if (query.isLoading) {
    return <div className="mobile-check loading">Rucksack wird geladen...</div>;
  }
  if (query.isError) {
    return (
      <main className="mobile-check">
        <ErrorPanel error={toError(query.error)} onRetry={() => void query.refetch()} />
      </main>
    );
  }
  if (!query.data) {
    return <div className="mobile-check loading">Rucksack wird geladen...</div>;
  }

  return <PublicCheckForm onSubmit={mutation.mutate} publicKit={query.data} submitError={mutation.error ? toError(mutation.error) : null} submitResult={mutation.data} />;
}

function PublicCheckForm({
  onSubmit,
  publicKit,
  submitError,
  submitResult
}: {
  onSubmit: (body: Parameters<typeof rescueBaseApi.completeCheck>[1]) => void;
  publicKit: PublicKitResponse;
  submitError: Error | null;
  submitResult?: { check: { id: string }; replenishmentOrder?: ReplenishmentOrder };
}) {
  const [checkerName, setCheckerName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<KitOperationalStatus>("READY");
  const [statusReason, setStatusReason] = useState("");
  const [lines, setLines] = useState<CheckLineState[]>(() => initialCheckLines(publicKit.template.positions));
  const [signatureHasInk, setSignatureHasInk] = useState(false);
  const [signatureError, setSignatureError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSignatureRef = useRef(false);
  const groupedPositions = useMemo(() => groupTemplatePositions(publicKit.template.positions), [publicKit.template.positions]);
  const linesById = useMemo(() => new Map(lines.map((line) => [line.templatePositionId, line])), [lines]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.strokeStyle = "#111827";
  }, []);

  const summary = useMemo(() => summarizeCheck(publicKit.template.positions, lines, selectedStatus), [lines, publicKit.template.positions, selectedStatus]);
  const canSubmit = checkerName.trim().length > 0 && (!summary.requiresReason || statusReason.trim().length > 0);

  if (submitResult) {
    return (
      <main className="mobile-check">
        <Panel className="success-panel">
          <CheckCircle2 />
          <h1>Check abgeschlossen</h1>
          <p>Protokoll {submitResult.check.id} wurde gespeichert.</p>
          {submitResult.replenishmentOrder ? <p>Nachfüllauftrag {submitResult.replenishmentOrder.id} wurde erzeugt.</p> : <p>Es wurde kein Nachfüllauftrag benötigt.</p>}
        </Panel>
      </main>
    );
  }

  return (
    <main className="mobile-check">
      <header className="check-header">
        <div>
          <span>{publicKit.kit.code}</span>
          <h1>{publicKit.kit.name}</h1>
          <p>
            {publicKit.template.name} · Version {publicKit.template.version}
          </p>
        </div>
        <Badge tone={selectedStatus === "READY" ? "ready" : selectedStatus === "CONDITIONAL" ? "warning" : "danger"}>
          {statusLabels[selectedStatus]}
        </Badge>
      </header>

      <Panel className="checker-panel">
        <Field label="Prüfername">
          <input value={checkerName} onChange={(event) => setCheckerName(event.target.value)} />
        </Field>
        <div aria-label="Einsatzbereitschaft" className="status-toggle" role="radiogroup">
          {(["READY", "CONDITIONAL", "NOT_READY"] as KitOperationalStatus[]).map((status) => (
            <button className={selectedStatus === status ? "selected" : ""} key={status} onClick={() => setSelectedStatus(status)} type="button">
              {statusLabels[status]}
            </button>
          ))}
        </div>
      </Panel>

      <section className="check-list">
        {groupedPositions.map((group) => (
          <section aria-label={`Modul ${group.title}`} className="check-group" key={group.key}>
            <div className="check-group-header">
              <h2>{group.title}</h2>
              <span>{group.positions.length} Positionen</span>
            </div>
            {group.positions.map((position) => {
              const line = linesById.get(position.id);
              const counted = line?.countedQuantity ?? 0;
              const discarded = line?.discardedExpiredQuantity ?? 0;
              return (
                <Panel className="check-item" key={position.id}>
                  <div>
                    <span>{position.critical ? "Kritische Position" : "Materialposition"}</span>
                    <h3>{position.articleName}</h3>
                    <p>
                      Soll: {position.requiredQuantity} {position.unit}
                    </p>
                  </div>
                  <Stepper label="Ist" onChange={(value) => updateLine(position.id, { countedQuantity: value })} value={counted} />
                  <Stepper label="Verworfen" onChange={(value) => updateLine(position.id, { discardedExpiredQuantity: value })} value={discarded} />
                </Panel>
              );
            })}
          </section>
        ))}
      </section>

      {summary.warnings.length > 0 ? (
        <Panel className="warning-panel">
          <AlertTriangle />
          <div>
            <strong>Bitte prüfen</strong>
            {summary.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </Panel>
      ) : null}

      {summary.requiresReason ? (
        <Field label="Begründung">
          <textarea onChange={(event) => setStatusReason(event.target.value)} rows={3} value={statusReason} />
        </Field>
      ) : null}

      <Panel className="signature-panel">
        <div className="panel-header">
          <div>
            <h2>Unterschrift</h2>
            <p>Name, Zeitstempel und Signatur werden 3 Jahre gespeichert.</p>
          </div>
          <Button onClick={() => { clearSignatureCanvas(); setSignatureError(""); }} type="button" variant="ghost">
            Löschen
          </Button>
        </div>
        <canvas
          ref={canvasRef}
          aria-label="Unterschriftenfeld"
          height="220"
          onPointerCancel={endSignatureStroke}
          onPointerDown={startSignatureStroke}
          onPointerMove={drawSignatureStroke}
          onPointerUp={endSignatureStroke}
          width="640"
        />
      </Panel>

      {signatureError ? <InlineError error={new Error(signatureError)} /> : null}
      {submitError ? <InlineError error={submitError} /> : null}

      <footer className="check-footer">
        <div>
          <strong>{summary.missingCount + summary.discardedCount}</strong>
          <span>Nachfüllbedarf</span>
        </div>
        <Button disabled={!canSubmit} onClick={submitCheck} type="button">
          Check abschließen
        </Button>
      </footer>
    </main>
  );

  function submitCheck() {
    if (!signatureHasInk) {
      setSignatureError("Bitte unterschreiben Sie den Check.");
      return;
    }
    const signature = canvasRef.current?.toDataURL("image/png");
    if (!signature) return;
    onSubmit({ checkerName, positions: lines, selectedStatus, signaturePngDataUrl: signature, statusReason });
  }

  function startSignatureStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = canvasPoint(event);
    isDrawingSignatureRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setSignatureHasInk(true);
    setSignatureError("");
  }
  function drawSignatureStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingSignatureRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = canvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }
  function endSignatureStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingSignatureRef.current) return;
    isDrawingSignatureRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function clearSignatureCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureHasInk(false);
  }
  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (event.currentTarget.width / rect.width),
      y: (event.clientY - rect.top) * (event.currentTarget.height / rect.height)
    };
  }
  function updateLine(positionId: string, patch: Partial<CheckLineState>) {
    setLines((current) => current.map((line) => (line.templatePositionId === positionId ? { ...line, ...patch } : line)));
  }
}
