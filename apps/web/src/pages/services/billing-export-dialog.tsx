import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, Field } from "../../components/ui";
import { exportBillingDocument, type BillingKind } from "./billing-export";
import type { Service } from "./types";
import { useServices } from "./api";
import { ApiError } from "../../lib/openapi-client";
import "./form.css";
const berlinDate = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
function validUntil(issuedOn: string, days: number) {
  const date = new Date(`${issuedOn}T12:00:00Z`);
  if (Number.isNaN(date.valueOf())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
export function BillingExportDialog({ service, kind, onClose }: {
  service: Service; kind: BillingKind; onClose: () => void;
}) {
  const client = useQueryClient();
  const settings = useServices<{ offerValidityDays: number; version: number }>("/billing-settings");
  const label = kind === "OFFER" ? "Angebot" : "Rechnung";
  const [number, setNumber] = useState("");
  const [issuedOn, setIssuedOn] = useState(berlinDate);
  const [recipient, setRecipient] = useState(service.customer);
  const [salutation, setSalutation] = useState("Sehr geehrte Damen und Herren,");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const close = () => { if (!pending) onClose(); };
  return (
    <Dialog open title={`${label} erstellen`} onClose={close}>
      <form className="service-form" aria-label={`${label} erstellen`} onSubmit={async (event) => {
        event.preventDefault();
        if (!settings.data) return;
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
          await exportBillingDocument(service, { kind, number: number.trim(), issuedOn, recipient: recipient.trim(), salutation: salutation.trim(), settingsVersion: settings.data.version });
          await client.invalidateQueries({ queryKey: ["services"] });
          onClose();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Das PDF konnte nicht erstellt werden.");
          if (cause instanceof ApiError && cause.status === 409) await client.invalidateQueries({ queryKey: ["services"] });
        } finally { setPending(false); }
      }}>
        <fieldset disabled={pending || !settings.data}>
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
            <Field label="Anrede" required>
              <input required maxLength={150} value={salutation} onChange={(event) => setSalutation(event.target.value)} />
            </Field>
          </div>
          {kind === "OFFER" && issuedOn && settings.data ? <p>Gültig bis {validUntil(issuedOn, settings.data.offerValidityDays)} ({settings.data.offerValidityDays} Tage).</p> : null}
          <p className="service-tool-meta">{kind === "OFFER" ? "Die gespeicherte Planung bildet die Grundlage." : "Erfasste Ist-Zeiten werden verwendet. Ohne Ist-Zeiten gelten die geplanten Zeiten; diese Positionen sind im PDF gekennzeichnet."} Der Versandstatus wird separat gepflegt.</p>
        </fieldset>
        {settings.isError ? <div role="alert"><p>Die Absender-Einstellungen konnten nicht geladen werden.</p><Button type="button" variant="secondary" onClick={() => void settings.refetch()}>Einstellungen erneut laden</Button></div> : !settings.data ? <p role="status">Absender-Einstellungen werden geladen …</p> : null}
        {error ? <p className="service-error" role="alert">{error}</p> : null}
        <div className="service-dialog-actions">
          <Button variant="secondary" type="button" disabled={pending} onClick={close}>Abbrechen</Button>
          <Button type="submit" disabled={!settings.data} loading={pending}>PDF erstellen</Button>
        </div>
      </form>
    </Dialog>
  );
}
