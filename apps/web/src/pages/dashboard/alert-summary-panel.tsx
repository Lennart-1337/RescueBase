import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { getAlertOverview } from "../../lib/extra-api";
import { Badge, Panel } from "../../components/ui";
import { InlineError, LoadingPanel } from "../../components/state-panels";

export function AlertSummaryPanel() {
  const query = useQuery({ queryKey: ["alert-overview"], queryFn: getAlertOverview });

  if (query.isLoading) {
    return <LoadingPanel label="Warnungen werden geladen" />;
  }
  if (query.isError || !query.data) {
    return <InlineError error={query.error ?? new Error("Warnungen konnten nicht geladen werden.")} />;
  }

  return (
    <Panel>
      <div className="panel-header">
        <div><h2>Warnungen</h2><p>Aktive Fälligkeits- und Ablaufwarnungen.</p></div>
        <AlertTriangle />
      </div>
      <div className="metric-row">
        <Badge tone="danger">Ablauf {query.data.summary.expiry}</Badge>
        <Badge tone="warning">STK {query.data.summary.stkDue}</Badge>
        <Badge tone="warning">MTK {query.data.summary.mtkDue}</Badge>
      </div>
      {query.data.warnings.length === 0 ? <div className="compact-list-empty">Keine aktiven Warnungen.</div> : null}
      <div className="compact-list">
        {query.data.warnings.slice(0, 5).map((warning) => (
          <div className="compact-list-row" key={warning.id}>
            <span>
              <strong>{warning.title}</strong>
              <small>{warning.locationName ?? "ohne Standort"} · {warning.dueAt ? warning.dueAt.slice(0, 10) : "sofort"}</small>
            </span>
            <Badge tone={warning.category === "EXPIRY" ? "danger" : "warning"}>{warning.category}</Badge>
          </div>
        ))}
      </div>
    </Panel>
  );
}
