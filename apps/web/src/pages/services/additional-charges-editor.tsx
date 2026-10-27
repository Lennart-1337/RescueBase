import { Button } from "../../components/ui";
import { newId } from "./editor";
import type { AdditionalCharge } from "./additional-charges";
import "./additional-charges.css";

export function AdditionalChargesEditor({ charges, onChange }: {
  charges: AdditionalCharge[];
  onChange: (charges: AdditionalCharge[]) => void;
}) {
  const change = (id: string, values: Partial<AdditionalCharge>) =>
    onChange(charges.map((row) => row.id === id ? { ...row, ...values } : row));
  return (
    <section className="service-additional-charges">
      <header className="service-section-header">
        <h3>Weitere Posten</h3>
        <Button type="button" variant="secondary"
          onClick={() => onChange([...charges, { id: newId(), label: "", amount: "0" }])}>
          Posten hinzufügen
        </Button>
      </header>
      {charges.map((charge, index) => (
        <div className="service-additional-charge" key={charge.id}>
          <label>Bezeichnung
            <input aria-label={`Bezeichnung für Posten ${index + 1}`} type="text"
              maxLength={191} required value={charge.label}
              onChange={(event) => change(charge.id, { label: event.target.value })} />
          </label>
          <label>Betrag (EUR)
            <input aria-label={`Betrag für Posten ${index + 1} (EUR)`} type="text"
              inputMode="decimal" required value={charge.amount}
              onChange={(event) => change(charge.id, { amount: event.target.value })} />
          </label>
          <Button type="button" variant="ghost"
            aria-label={`Posten entfernen: ${charge.label.trim() || index + 1}`}
            onClick={() => onChange(charges.filter((row) => row.id !== charge.id))}>
            Entfernen
          </Button>
        </div>
      ))}
    </section>
  );
}
