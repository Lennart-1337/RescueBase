import { useQuery } from "@tanstack/react-query";
import { InlineError } from "../../../components/state-panels";
import { Button, Panel } from "../../../components/ui";
import { billingSettingsKey, getServiceBillingSettings } from "../../../lib/service-billing-settings";
import { BillingSettingsForm } from "./form";
import "./settings.css";
export function ServiceBillingSettingsPanel() {
  const query = useQuery({ queryKey: billingSettingsKey, queryFn: getServiceBillingSettings, retry: false });
  return <Panel aria-label="Angebote und Rechnungen" className="billing-settings-panel">
    <div className="panel-header"><div><h2>Angebote und Rechnungen</h2><p>Diese Angaben werden für neue PDF-Dokumente übernommen. Bereits erstellte Dokumente bleiben unverändert.</p></div></div>
    {query.isPending ? <p className="billing-settings-message" role="status">Dokumenteinstellungen werden geladen …</p> : null}
    {query.error ? <div className="billing-settings-message"><InlineError error={query.error} /><Button variant="secondary" onClick={() => void query.refetch()}>Erneut laden</Button></div> : null}
    {query.data ? <BillingSettingsForm initial={query.data} /> : null}
  </Panel>;
}
