import { BillingStatus, type BillingFlags } from "./billing-status";
import { Button } from "../../components/ui";
import type { ServiceEditorProps } from "./editor";
import { FinanceSummary } from "./finance-summary";
import { FinancePricing } from "./finance-pricing";
import "./service-tools.css";
import "./finance.css";
export function Finance(props: ServiceEditorProps & { onBillingSave: (flags: BillingFlags) => Promise<unknown> }) {
  return (
    <div className="service-stack">
      <header className="service-section-header">
        <h2>Kalkulation</h2>
      </header>
      {props.locked && props.service.pricingModel === "LEGACY" ? (
        <FinanceSummary costs={props.service.costs} legacy />
      ) : (
        <FinancePricing key={`pricing-${props.service.version}`} {...props} />
      )}
      <BillingStatus key={`billing-${props.service.version}`} service={props.service} onSave={props.onBillingSave} />
      <section className="service-section service-tool-documents">
        <h3>Dokumente</h3>
        <span className="service-tool-meta">Vorlagen ausstehend</span>
        <div className="service-actions">
          <Button disabled variant="secondary">
            Angebot erstellen
          </Button>
          <Button disabled variant="secondary">
            Rechnung erstellen
          </Button>
        </div>
      </section>
    </div>
  );
}
