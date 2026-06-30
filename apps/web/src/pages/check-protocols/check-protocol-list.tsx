import { Eye } from "lucide-react";
import { formatDateTime } from "../../app/formatters";
import { RowActions } from "../../components/list-row";
import { PanelHeader } from "../../components/panel-header";
import { EmptyState } from "../../components/state-panels";
import { Badge, Button, Panel } from "../../components/ui";
import { StatusBadge } from "../../components/status-badge";
import type { CheckProtocolSummary } from "../../lib/types";
import "./check-protocol-list.css";

export function CheckProtocolList(props: {
  protocols: CheckProtocolSummary[];
  onOpen: (id: string) => void;
}) {
  return (
    <Panel>
      <PanelHeader title="Protokolle" />
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
            <span className="protocol-row-timestamp">
              <strong>{formatDateTime(protocol.createdAt)}</strong>
              <small>{protocol.positionCount} Positionen dokumentiert</small>
            </span>
            <div className="protocol-row-metrics">
              <Badge tone={protocol.deviationCount > 0 ? "warning" : "ready"}>
                {protocol.deviationCount > 0
                  ? `${protocol.deviationCount} Abweichungen`
                  : "Ohne Abweichung"}
              </Badge>
              <StatusBadge kind="kit" status={protocol.effectiveStatus} />
            </div>
            <RowActions className="protocol-row-actions">
              <Button
                aria-label="Details anzeigen"
                onClick={() => props.onOpen(protocol.id)}
                type="button"
                variant="secondary"
              >
                <Eye data-icon="inline-start" />
                Details
              </Button>
            </RowActions>
          </div>
        ))}
      </div>
    </Panel>
  );
}
