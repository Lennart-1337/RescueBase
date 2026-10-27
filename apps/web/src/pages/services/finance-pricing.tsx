import { useState } from "react";
import { calculateAttendancePricing } from "@rescuebase/domain";
import { Button, CheckboxField } from "../../components/ui";
import type { ServiceEditorProps } from "./editor";
import { FinanceSummary } from "./finance-summary";
import { PersonnelPrices } from "./personnel-prices";
import { money } from "./time";
import type { Costs } from "./types";
export function FinancePricing({
  service,
  catalog,
  save,
  locked,
}: ServiceEditorProps) {
  const [rates, setRates] = useState(() =>
    service.assignments.map((row) => row.hourlyRate),
  );
  const [discounted, setDiscounted] = useState(service.materialDiscounted);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const assignments = service.assignments.map((row, index) => ({
    ...row,
    hourlyRate: rates[index]!.trim().replace(",", "."),
  }));
  let costs: Costs | null = service.costs;
  if (!locked) {
    try {
      costs = calculateAttendancePricing(assignments, discounted);
    } catch {
      costs = null;
    }
  }
  return (
    <form
      aria-label="Kalkulation"
      className="service-pricing"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setPending(true);
        try {
          try {
            calculateAttendancePricing(assignments, discounted);
          } catch {
            throw new Error(
              "Bitte gültige Stundenpreise mit höchstens vier Nachkommastellen eingeben.",
            );
          }
          await save({ assignments, materialDiscounted: discounted });
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Speichern fehlgeschlagen.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <fieldset disabled={locked || pending}>
        <legend className="service-pricing-hidden">
          Stundenpreise und Material
        </legend>
        <PersonnelPrices
          assignments={assignments}
          people={catalog.people}
          rates={rates}
          onRate={(index, value) =>
            setRates((current) =>
              current.map((rate, i) => (i === index ? value : rate)),
            )
          }
        />
        <section className="service-material-charge">
          <div>
            <strong>Materialpauschale</strong>
            <span>{money(discounted ? "0.00" : "35.00")}</span>
          </div>
          <CheckboxField
            label="Materialpauschale als Rabatt"
            checked={discounted}
            onChange={(event) => setDiscounted(event.target.checked)}
          />
          {discounted ? <small>Rabatt: {money("35.00")}</small> : null}
        </section>
      </fieldset>
      <FinanceSummary costs={costs} />
      {error ? (
        <p role="alert" className="service-error">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={locked} loading={pending}>
        Kalkulation speichern
      </Button>
    </form>
  );
}
