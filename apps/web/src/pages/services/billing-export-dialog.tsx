import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, Field } from "../../components/ui";
import { exportBillingDocument, type BillingKind } from "./billing-export";
import type { Service } from "./types";
import "./form.css";
const berlinDate = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
function validUntil(issuedOn: string) {
  const date = new Date(`${issuedOn}T12:00:00Z`);
  if (Number.isNaN(date.valueOf())) return "";
  date.setUTCDate(date.getUTCDate() + 30);
  return new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
export function BillingExportDialog({ service, kind, onClose }: {
  service: Service; kind: BillingKind; onClose: () => void;
}) {
  const client = useQueryClient();
  const label = kind === "OFFER" ? "Angebot" : "Rechnung";
  const [number, setNumber] = useState("");
  const [issuedOn, setIssuedOn] = useState(berlinDate);
  const [recipient, setRecipient] = useState(service.customer);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const close = () => { if (!pending) onClose(); };
  return (
    <Dialog open title={`${label} erstellen`} onClose={close}>
      <form className="service-form" aria-label={`${label} erstellen`} onSubmit={async (event) => {
        event.preventDefault();
        if (!number.trim() || !recipient.trim() || !issuedOn) {
          setError("Bitte Nummer, Datum und Empfängeranschrift vollständig eingeben.");
          return;
        }
        if (recipient.trim().split(/\r?\n/).length > 8) {
          setError("Die Empfängeranschrift darf höchstens 8 Zeilen enthalten.");
          return;
        }
        setError(""); setPending(true);
        try {
          await exportBillingDocument(service, { kind, number: number.trim(), issuedOn, recipient: recipient.trim() });
          await client.invalidateQueries({ queryKey: ["services"] });
          onClose();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Das PDF konnte nicht erstellt werden.");
        } finally { setPending(false); }
      }}>
        <fieldset disabled={pending}>
          <legend className="service-pricing-hidden">Dokumentangaben</legend>
          <div className="service-fields">
            <Field label={kind === "OFFER" ? "Angebotsnummer" : "Rechnungsnummer"} required>
              <input required maxLength={64} pattern={"[A-Za-z0-9][A-Za-z0-9 ._\\-]*"} value={number} onChange={(event) => setNumber(event.target.value)} />
            </Field>
            <Field label={kind === "OFFER" ? "Angebotsdatum" : "Rechnungsdatum"} required>
              <input required type="date" value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} />
            </Field>
            <Field label="Empfängeranschrift" required>
              <textarea required rows={4} maxLength={500} value={recipient} onChange={(event) => setRecipient(event.target.value)} />
            </Field>
          </div>
          {kind === "OFFER" && issuedOn ? <p>Gültig bis {validUntil(issuedOn)} (30 Tage).</p> : null}
          <p className="service-tool-meta">{kind === "OFFER" ? "Die gespeicherte Planung bildet die Grundlage." : "Die erfassten tatsächlichen Einsatzzeiten bilden die Grundlage."} Der Versandstatus wird separat gepflegt.</p>
        </fieldset>
        {error ? <p className="service-error" role="alert">{error}</p> : null}
        <div className="service-dialog-actions">
          <Button variant="secondary" type="button" disabled={pending} onClick={close}>Abbrechen</Button>
          <Button type="submit" loading={pending}>PDF erstellen</Button>
        </div>
      </form>
    </Dialog>
  );
}
