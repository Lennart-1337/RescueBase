import { Eye } from "lucide-react";
import { formatDateTime, statusLabels } from "../../app/formatters";
import { EmptyState } from "../../components/state-panels";
import { Badge, Button, Panel } from "../../components/ui";
import type { CheckProtocolSummary } from "../../lib/types";
import { protocolStatusTone } from "./check-protocol-status";
import "./check-protocol-list.css";

export function CheckProtocolList(props: {
  protocols: CheckProtocolSummary[];
  onOpen: (id: string) => void;
}) {
  return (
    <Panel>
      <div className="panel-header">
        <div><h2>Protokolle</h2></div>
      </div>
      {props.protocols.length === 0 ? (
        <EmptyState
          title="Keine Protokolle"
          text="Für die gewählten Filter wurden keine Checks gefunden."
        />
      ) : null}
      <div className="table">
        {props.protocols.map((protocol) => (
          <div className="table-row protocol-row" key={protocol.id}>
            <span>
              <strong>{protocol.kit.name}</strong>
              <small>
                {protocol.kit.code} · {protocol.checkerName}
              </small>
            </span>
            <span>
              <strong>{formatDateTime(protocol.createdAt)}</strong>
              <small>{protocol.positionCount} Positionen dokumentiert</small>
            </span>
            <div className="protocol-row-metrics">
              <Badge tone={protocol.deviationCount > 0 ? "warning" : "ready"}>
                {protocol.deviationCount > 0
                  ? `${protocol.deviationCount} Abweichungen`
                  : "Ohne Abweichung"}
              </Badge>
              <Badge tone={protocolStatusTone(protocol.effectiveStatus)}>
                {statusLabels[protocol.effectiveStatus]}
              </Badge>
            </div>
            <div className="row-actions protocol-row-actions">
              <Button
                aria-label="Details anzeigen"
                onClick={() => props.onOpen(protocol.id)}
                type="button"
                variant="secondary"
              >
                <Eye data-icon="inline-start" />
                Details
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
