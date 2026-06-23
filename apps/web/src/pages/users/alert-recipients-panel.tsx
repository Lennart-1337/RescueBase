import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { getAlertSubscriptions } from "../../lib/extra-api";
import { InlineError, LoadingPanel } from "../../components/state-panels";
import { Badge, Panel } from "../../components/ui";

export function AlertRecipientsPanel() {
  const query = useQuery({ queryKey: ["alert-subscriptions"], queryFn: getAlertSubscriptions });

  if (query.isLoading) {
    return <LoadingPanel label="Alarmempfänger werden geladen" />;
  }
  if (query.isError || !query.data) {
    return <InlineError error={query.error ?? new Error("Alarmempfänger konnten nicht geladen werden.")} />;
  }

  return (
    <Panel>
      <div className="panel-header">
        <div><h2>Alarmempfänger</h2></div>
        <Users />
      </div>
      {query.data.length === 0 ? <div className="compact-list-empty">Noch keine Alarmregeln gesetzt.</div> : null}
      <div className="compact-list">
        {query.data.map((subscription) => (
          <div className="compact-list-row compact-list-row-actions" key={subscription.id}>
            <span>
              <strong>{subscription.user.displayName}</strong>
              <small>{subscription.user.email} · {subscription.category} · {subscription.locationName ?? "global"}</small>
            </span>
            <Badge tone="info">{subscription.category}</Badge>
          </div>
        ))}
      </div>
    </Panel>
  );
}
