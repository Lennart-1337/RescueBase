import { formatDateTime, formatStatus, statusLabels } from "../../app/formatters";
import { LoadingPanel } from "../../components/state-panels";
import { Badge, Button, Dialog } from "../../components/ui";
import type { CheckProtocolDetail } from "../../lib/types";

export function CheckProtocolDialog(props: { detail?: CheckProtocolDetail; isLoading: boolean; onClose: () => void; open: boolean }) {
  return (
    <Dialog actions={<Button onClick={props.onClose} type="button" variant="secondary">Schließen</Button>} description="Vollständige Dokumentation des abgeschlossenen Rucksackchecks." onClose={props.onClose} open={props.open} title="Check-Protokoll">
      {props.isLoading || !props.detail ? <LoadingPanel label="Protokoll wird geladen" /> : <ProtocolContent detail={props.detail} />}
    </Dialog>
  );
}

function ProtocolContent({ detail }: { detail: CheckProtocolDetail }) {
  return (
    <div className="protocol-detail">
      <div className="protocol-summary-grid">
        <Summary label="Rucksack" value={`${detail.kit.name} · ${detail.kit.code}`} />
        <Summary label="Geprüft von" value={detail.checkerName} />
        <Summary label="Zeitpunkt" value={formatDateTime(detail.createdAt)} />
        <Summary label="Ergebnis" value={statusLabels[detail.effectiveStatus]} />
      </div>
      {detail.warnings.length > 0 ? <section className="protocol-block"><h3>Hinweise</h3>{detail.warnings.map((warning) => <div className="dialog-note" key={warning}>{warning}</div>)}</section> : null}
      <section className="protocol-block"><h3>Positionen</h3><div className="compact-list">{detail.positions.map((position) => <div className="compact-list-row protocol-position" key={position.id}><span><strong>{position.articleName}</strong><small>{position.moduleName ?? "Ohne Modul"}{position.note ? ` · ${position.note}` : ""}</small></span><div className="row-actions"><Badge tone="neutral">Soll {position.requiredQuantity}</Badge><Badge tone="info">Gezählt {position.countedQuantity}</Badge>{position.missingQuantity > 0 ? <Badge tone="warning">Fehlt {position.missingQuantity}</Badge> : null}{position.discardedExpiredQuantity > 0 ? <Badge tone="danger">Verworfen {position.discardedExpiredQuantity}</Badge> : null}{position.surplusQuantity > 0 ? <Badge tone="info">Über {position.surplusQuantity}</Badge> : null}</div></div>)}</div></section>
      <section className="protocol-block protocol-signature"><div><h3>Unterschrift</h3><code>{detail.signatureHash}</code></div><img alt={`Unterschrift von ${detail.checkerName}`} src={detail.signaturePngDataUrl} /></section>
      {detail.replenishmentOrder ? <div className="dialog-note">Nachfüllauftrag: {detail.replenishmentOrder.id} · {formatStatus(detail.replenishmentOrder.status)}</div> : null}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="protocol-summary-item"><span>{label}</span><strong>{value}</strong></div>;
}
