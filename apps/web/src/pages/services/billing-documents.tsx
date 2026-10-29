import { useState } from "react";
import { Button } from "../../components/ui";
import { BillingExportDialog } from "./billing-export-dialog";
import type { BillingKind } from "./billing-export";
import type { Service } from "./types";
export function BillingDocuments({ service }: { service: Service }) {
  const [kind, setKind] = useState<BillingKind | null>(null);
  return (
    <>
      <section className="service-section service-tool-documents">
        <h3>Dokumente</h3>
        <p className="service-tool-meta">PDF erstellen und unter „Vorbereitung“ ablegen.</p>
        <div className="service-actions">
          <Button disabled={service.status === "CANCELLED"} variant="secondary" onClick={() => setKind("OFFER")}>Angebot erstellen</Button>
          <Button disabled={service.status === "CANCELLED"} variant="secondary" onClick={() => setKind("INVOICE")}>Rechnung erstellen</Button>
        </div>
      </section>
      {kind ? <BillingExportDialog kind={kind} service={service} onClose={() => setKind(null)} /> : null}
    </>
  );
}
