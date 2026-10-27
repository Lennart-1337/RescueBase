import { useState } from "react";
import { calculateAttendancePricing } from "@rescuebase/domain";
import { Button } from "../../components/ui";
import type { ServiceEditorProps } from "./editor";
import { FinanceSummary } from "./finance-summary";
import { PersonnelPrices } from "./personnel-prices";
import { MaterialCharge } from "./material-charge";
import { AdditionalChargesEditor } from "./additional-charges-editor";
import { normalizeAdditionalCharges } from "./additional-charges";
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
  const [materialRate, setMaterialRate] = useState(service.materialRate);
  const [additionalCharges, setAdditionalCharges] = useState(service.additionalCharges);
  const normalizedMaterialRate = materialRate.trim().replace(",", ".");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const assignments = service.assignments.map((row, index) => ({
    ...row,
    hourlyRate: rates[index]!.trim().replace(",", "."),
  }));
  let costs: Costs | null = service.costs;
  if (!locked) {
    try {
      costs = calculateAttendancePricing(assignments, discounted, normalizedMaterialRate, normalizeAdditionalCharges(additionalCharges));
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
          const charges = normalizeAdditionalCharges(additionalCharges);
          try {
            calculateAttendancePricing(assignments, discounted, normalizedMaterialRate, charges);
          } catch {
            throw new Error(
              "Bitte gültige Stundenpreise (maximal vier Nachkommastellen) und eine Materialpauschale (maximal zwei Nachkommastellen) eingeben.",
            );
          }
          await save({ assignments, materialDiscounted: discounted, materialRate: normalizedMaterialRate, additionalCharges: charges });
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
        <MaterialCharge rate={materialRate} discounted={discounted}
          onRate={setMaterialRate} onDiscount={setDiscounted} />
        <AdditionalChargesEditor charges={additionalCharges} onChange={setAdditionalCharges} />
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
