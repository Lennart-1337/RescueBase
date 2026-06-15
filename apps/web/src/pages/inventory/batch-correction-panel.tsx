import type { UseQueryResult } from "@tanstack/react-query";
import { Archive, Save } from "lucide-react";
import { EmptyState, InlineError, LoadingPanel } from "../../components/state-panels";
import { Badge, Button, Field, Panel } from "../../components/ui";
import { formatDateTime, formatMovementType, toError } from "../../app/formatters";
import type { Batch, InventoryMovement, Location } from "../../lib/types";

export function BatchCorrectionPanel(props: {
  correctionError: Error | null;
  correctionExpiresAt: string;
  correctionLocationId: string;
  correctionLotNumber: string;
  correctionQuantity: number;
  correctionReason: string;
  locations: Location[];
  movements: UseQueryResult<InventoryMovement[], Error>;
  onExpiresAtChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onLotNumberChange: (value: string) => void;
  onQuantityChange: (value: number) => void;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
  selectedBatch: Batch | null;
}) {
  const hasChanges = Boolean(props.selectedBatch && (props.correctionQuantity !== props.selectedBatch.quantity || props.correctionLotNumber.trim() !== props.selectedBatch.lotNumber || props.correctionExpiresAt !== props.selectedBatch.expiresAt || props.correctionLocationId !== props.selectedBatch.locationId));
  if (!props.selectedBatch) return <Panel><EmptyState text="Wählen Sie links eine Charge aus, um sie nachvollziehbar zu korrigieren." title="Keine Charge ausgewählt" /></Panel>;
  return (
    <Panel>
      <div className="panel-header"><div><h2>Chargenkorrektur</h2><p>{props.selectedBatch.article.name} · {props.selectedBatch.article.unit}</p></div><Archive /></div>
      <div className="form-grid form-grid-two">
        <Field label="Chargennummer"><input value={props.correctionLotNumber} onChange={(event) => props.onLotNumberChange(event.target.value)} /></Field>
        <Field label="Lagerort"><select value={props.correctionLocationId} onChange={(event) => props.onLocationChange(event.target.value)}>{props.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
        <Field label="Ablaufdatum"><input type="date" value={props.correctionExpiresAt} onChange={(event) => props.onExpiresAtChange(event.target.value)} /></Field>
        <Field label="Menge"><input min="0" onChange={(event) => props.onQuantityChange(Number(event.target.value))} type="number" value={props.correctionQuantity} /></Field>
      </div>
      <div className="template-form"><Field label="Begründung"><textarea onChange={(event) => props.onReasonChange(event.target.value)} rows={3} value={props.correctionReason} /></Field></div>
      {props.correctionError ? <InlineError error={props.correctionError} /> : null}
      <div className="form-actions"><Button disabled={!hasChanges || !props.correctionReason.trim()} onClick={props.onSubmit} type="button"><Save data-icon="inline-start" />Korrektur buchen</Button></div>
      <div className="panel-header panel-subheader"><div><h2>Historie</h2><p>Bewegungen und Korrekturen dieser Charge.</p></div></div>
      {props.movements.isLoading ? <LoadingPanel label="Historie wird geladen" /> : null}
      {props.movements.isError ? <InlineError error={toError(props.movements.error)} /> : null}
      {props.movements.data ? <div className="compact-list">{props.movements.data.map((movement) => <div className="compact-list-row compact-list-row-actions" key={movement.id}><span><strong>{formatMovementType(movement.type)}</strong><small>{formatDateTime(movement.createdAt)} · {movement.actorLabel}{movement.reason ? ` · ${movement.reason}` : ""}</small></span><Badge tone={movement.quantity < 0 ? "warning" : movement.quantity > 0 ? "ready" : "info"}>{movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}</Badge></div>)}</div> : null}
    </Panel>
  );
}
