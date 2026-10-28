import { useState } from "react";
import { Button, CheckboxField } from "../../components/ui";
import type { Service } from "./types";
import { displayTime } from "./time";
import "./billing-status.css";
export type BillingFlags = { offerSent: boolean; invoiceSent: boolean; invoicePaid: boolean };
const fields = [
  { flag: "offerSent", date: "offerSentAt", label: "Angebot verschickt" },
  { flag: "invoiceSent", date: "invoiceSentAt", label: "Rechnung verschickt" },
  { flag: "invoicePaid", date: "invoicePaidAt", label: "Rechnung bezahlt" },
] as const;
export function BillingStatus({ service, onSave }: {
  service: Service;
  onSave: (flags: BillingFlags) => Promise<unknown>;
}) {
  const [flags, setFlags] = useState<BillingFlags>({
    offerSent: Boolean(service.offerSentAt),
    invoiceSent: Boolean(service.invoiceSentAt),
    invoicePaid: Boolean(service.invoicePaidAt),
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="service-section">
      <h3>Abrechnungsstatus</h3>
      <form className="service-billing-status" aria-label="Abrechnungsstatus"
        onSubmit={async (event) => {
          event.preventDefault(); setPending(true); setError("");
          try { await onSave(flags); }
          catch (cause) { setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen."); }
          finally { setPending(false); }
        }}>
        <fieldset disabled={pending}>
          <legend className="service-pricing-hidden">Versand und Zahlung</legend>
          {fields.map(({ flag, date, label }) => (
            <CheckboxField key={flag} label={label} aria-label={label} checked={flags[flag]}
              description={flags[flag] && service[date] ? `Erfasst: ${displayTime(service[date])}` : undefined}
              onChange={(event) => setFlags((current) => ({ ...current, [flag]: event.target.checked }))} />
          ))}
        </fieldset>
        {error ? <p className="service-error" role="alert">{error}</p> : null}
        <Button type="submit" variant="secondary" loading={pending}>Abrechnungsstatus speichern</Button>
      </form>
    </section>
  );
}
