import { CheckboxField, Field } from "../../components/ui";
import { money } from "./time";
export function MaterialCharge({ rate, discounted, onRate, onDiscount }: {
  rate: string;
  discounted: boolean;
  onRate: (value: string) => void;
  onDiscount: (value: boolean) => void;
}) {
  return (
    <section className="service-material-charge">
      <Field label="Materialpauschale (EUR)">
        <input id="service-material-rate" type="text" inputMode="decimal"
          required value={rate} onChange={(event) => onRate(event.target.value)} />
      </Field>
      <CheckboxField label="Materialpauschale als Rabatt" checked={discounted}
        onChange={(event) => onDiscount(event.target.checked)} />
      {discounted && /^\d{1,10}(\.\d{1,2})?$/.test(rate.trim().replace(",", "."))
        ? <small>Rabatt: {money(rate.trim().replace(",", "."))} · Berechnet: {money("0.00")}</small>
        : null}
    </section>
  );
}
