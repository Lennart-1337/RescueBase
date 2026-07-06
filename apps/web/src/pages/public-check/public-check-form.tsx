import { useMemo, useState } from "react";
import { ThemeToggle } from "../../app/theme";
import { InlineError } from "../../components/state-panels";
import { StatusBadge, statusLabel } from "../../components/status-badge";
import { Button, Field, Panel } from "../../components/ui";
import { groupTemplatePositions, initialCheckLines, summarizeCheck, type CheckLineState } from "../../lib/check";
import type { PublicKitResponse } from "../../lib/types";
import { CheckGroups } from "./public-check-groups";
import { SignaturePad } from "./signature-pad";
import "./public-check-form.css";

export function PublicCheckForm(props: {
  isSubmitting: boolean;
  onSubmit: (body: { checkerName: string; positions: CheckLineState[]; signaturePngDataUrl: string }) => void;
  publicKit: PublicKitResponse;
  submitError: Error | null;
}) {
  const [checkerName, setCheckerName] = useState("");
  const [lines, setLines] = useState<CheckLineState[]>(() => initialCheckLines(props.publicKit.template.positions));
  const [signature, setSignature] = useState("");
  const [signatureError, setSignatureError] = useState("");
  const groupedPositions = useMemo(() => groupTemplatePositions(props.publicKit.template.positions), [props.publicKit.template.positions]);
  const linesById = useMemo(() => new Map(lines.map((line) => [line.templatePositionId, line])), [lines]);
  const summary = useMemo(() => summarizeCheck(props.publicKit.template.positions, lines), [lines, props.publicKit.template.positions]);
  const canSubmit = checkerName.trim().length > 0 && Boolean(signature);

  return (
    <main className="mobile-check">
      <header className="mobile-check-toolbar">
        <ThemeToggle className="public-theme-toggle" />
      </header>
      <header className="check-header">
        <div><span>{props.publicKit.kit.code}</span><h1>{props.publicKit.kit.name}</h1><p>{props.publicKit.template.name} · Version {props.publicKit.template.version}</p></div>
        <StatusBadge kind="kit" status={summary.effectiveStatus} />
      </header>
      <Panel className="check-summary">
        <div className="check-summary-row">
          <div><strong>{summary.missingCount + summary.discardedCount}</strong><span>Nachfüllbedarf</span></div>
          <div><strong>{summary.discardedCount}</strong><span>Verworfen</span></div>
        </div>
      </Panel>
      <CheckGroups groupedPositions={groupedPositions} linesById={linesById} onUpdateLine={(positionId, patch) => setLines((current) => current.map((line) => line.templatePositionId === positionId ? { ...line, ...patch } : line))} />
      {summary.warnings.length > 0 ? <Panel className="warning-panel"><div><strong>Bitte prüfen</strong>{summary.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div></Panel> : null}
      <SignaturePad onChange={(nextSignature) => { setSignature(nextSignature); setSignatureError(""); }}>
        <Field label="Prüfername"><input onChange={(event) => setCheckerName(event.target.value)} value={checkerName} /></Field>
      </SignaturePad>
      {signatureError ? <InlineError error={new Error(signatureError)} /> : null}
      {props.submitError ? <InlineError error={props.submitError} /> : null}
      <footer className="check-footer">
        <div><strong>{statusLabel("kit", summary.effectiveStatus)}</strong></div>
        <Button disabled={!canSubmit} loading={props.isSubmitting} onClick={() => signature ? props.onSubmit({ checkerName, positions: lines, signaturePngDataUrl: signature }) : setSignatureError("Bitte unterschreiben Sie den Check.")} type="button">Check abschließen</Button>
      </footer>
    </main>
  );
}
