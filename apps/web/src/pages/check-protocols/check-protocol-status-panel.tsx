import { Panel } from "../../components/ui";
import type { CheckProtocolSummary } from "../../lib/types";

export function CheckProtocolStatusPanel(props: {
  protocols: CheckProtocolSummary[];
  total: number;
}) {
  const ready = props.protocols.filter(
    (protocol) => protocol.effectiveStatus === "READY",
  ).length;
  const conditional = props.protocols.filter(
    (protocol) => protocol.effectiveStatus === "CONDITIONAL",
  ).length;
  const notReady = props.protocols.filter(
    (protocol) => protocol.effectiveStatus === "NOT_READY",
  ).length;
  const deviations = props.protocols.reduce(
    (sum, protocol) => sum + protocol.deviationCount,
    0,
  );

  return (
    <Panel>
      <div className="panel-header">
        <div><h2>Statusbild</h2></div>
      </div>
      <div className="protocol-status-grid">
        <StatusCard label="Gefiltert" tone="info" value={String(props.total)} />
        <StatusCard
          label="Mit Abweichung"
          tone="warning"
          value={String(deviations)}
        />
        <StatusCard label="Bereit" tone="ready" value={String(ready)} />
        <StatusCard
          label="Bedingt"
          tone="warning"
          value={String(conditional)}
        />
        <StatusCard
          label="Nicht bereit"
          tone="danger"
          value={String(notReady)}
        />
      </div>
    </Panel>
  );
}

function StatusCard(props: {
  label: string;
  tone: "danger" | "info" | "ready" | "warning";
  value: string;
}) {
  return (
    <div className={`protocol-status-card protocol-status-card-${props.tone}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}
