import { useMemo, useState } from "react";
import type { CheckLineState } from "../../lib/check";
import { groupTemplatePositions, initialCheckLines, summarizeCheck } from "../../lib/check";
import type { KitOperationalStatus, PublicKitResponse } from "../../lib/types";
import { statusLabels } from "../../app/formatters";
import { InlineError } from "../../components/state-panels";
import { Badge, Button, Field, Panel } from "../../components/ui";
import { CheckGroups } from "./public-check-groups";
import { SignaturePad } from "./signature-pad";

export function PublicCheckForm(props: {
  onSubmit: (body: { checkerName: string; positions: CheckLineState[]; selectedStatus: KitOperationalStatus; signaturePngDataUrl: string; statusReason: string }) => void;
  publicKit: PublicKitResponse;
  submitError: Error | null;
}) {
  const [checkerName, setCheckerName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<KitOperationalStatus>("READY");
  const [statusReason, setStatusReason] = useState("");
  const [lines, setLines] = useState<CheckLineState[]>(() => initialCheckLines(props.publicKit.template.positions));
  const [signature, setSignature] = useState("");
  const [signatureError, setSignatureError] = useState("");
  const groupedPositions = useMemo(() => groupTemplatePositions(props.publicKit.template.positions), [props.publicKit.template.positions]);
  const linesById = useMemo(() => new Map(lines.map((line) => [line.templatePositionId, line])), [lines]);
  const summary = useMemo(() => summarizeCheck(props.publicKit.template.positions, lines, selectedStatus), [lines, props.publicKit.template.positions, selectedStatus]);
  const canSubmit = checkerName.trim().length > 0 && Boolean(signature) && (!summary.requiresReason || statusReason.trim().length > 0);

  return (
    <main className="mobile-check">
      <header className="check-header">
        <div><span>{props.publicKit.kit.code}</span><h1>{props.publicKit.kit.name}</h1><p>{props.publicKit.template.name} · Version {props.publicKit.template.version}</p></div>
        <Badge tone={selectedStatus === "READY" ? "ready" : selectedStatus === "CONDITIONAL" ? "warning" : "danger"}>{statusLabels[selectedStatus]}</Badge>
      </header>
      <Panel className="checker-panel">
        <Field label="Prüfername"><input value={checkerName} onChange={(event) => setCheckerName(event.target.value)} /></Field>
        <div aria-label="Einsatzbereitschaft" className="status-toggle" role="radiogroup">
          {(["READY", "CONDITIONAL", "NOT_READY"] as KitOperationalStatus[]).map((status) => <button className={selectedStatus === status ? "selected" : ""} key={status} onClick={() => setSelectedStatus(status)} type="button">{statusLabels[status]}</button>)}
        </div>
      </Panel>
      <CheckGroups groupedPositions={groupedPositions} linesById={linesById} onUpdateLine={(positionId, patch) => setLines((current) => current.map((line) => (line.templatePositionId === positionId ? { ...line, ...patch } : line)))} />
      {summary.warnings.length > 0 ? <Panel className="warning-panel"><div><strong>Bitte prüfen</strong>{summary.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div></Panel> : null}
      {summary.requiresReason ? <Field label="Begründung"><textarea onChange={(event) => setStatusReason(event.target.value)} rows={3} value={statusReason} /></Field> : null}
      <SignaturePad onChange={(nextSignature) => { setSignature(nextSignature); setSignatureError(""); }} />
      {signatureError ? <InlineError error={new Error(signatureError)} /> : null}
      {props.submitError ? <InlineError error={props.submitError} /> : null}
      <footer className="check-footer">
        <div><strong>{summary.missingCount + summary.discardedCount}</strong><span>Nachfüllbedarf</span></div>
        <Button disabled={!canSubmit} onClick={() => signature ? props.onSubmit({ checkerName, positions: lines, selectedStatus, signaturePngDataUrl: signature, statusReason }) : setSignatureError("Bitte unterschreiben Sie den Check.")} type="button">Check abschließen</Button>
      </footer>
    </main>
  );
}
