import { useState } from "react";
import { MAURER_EVENT_FACTORS } from "@rescuebase/domain";
import { Button, Dialog, Field } from "../../components/ui";
import { ServiceForm, type Values } from "./form";
import { useServiceAction } from "./api";
import { AssessmentResult } from "./assessment";
import { parseInput, type Zone } from "./calculation-input";
import { CalculationZones } from "./calculation-zones";
import { needFields } from "./need-fields";
import type { ServiceEditorProps } from "./editor";
import "./service-tools.css";
export function Need({ service, locked }: ServiceEditorProps) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"MAURER" | "COLOGNE">("MAURER");
  const latest = service.calculations.find(
    (calculation) => calculation.method === method,
  );
  const history = service.calculations.filter(
    (calculation) =>
      calculation.method === method && calculation.id !== latest?.id,
  );
  const [zones, setZones] = useState<Zone[]>(() => {
    const input = service.calculations.find(
      (calculation) => calculation.method === "COLOGNE",
    )?.input as
      | {
          zones?: {
            id: string;
            expectedVisitors: number;
            riskFactor: number;
          }[];
        }
      | undefined;
    return (input?.zones ?? []).map((zone) => ({
      key: crypto.randomUUID(),
      id: zone.id,
      expectedVisitors: String(zone.expectedVisitors),
      riskFactor: String(zone.riskFactor),
    }));
  });
  const action = useServiceAction();
  const initial: Values = { ...latest?.input };
  if (
    method === "MAURER" &&
    !initial.eventCategory &&
    initial.eventFactor != null
  )
    initial.eventCategory = MAURER_EVENT_FACTORS.find(
      (event) => event.factor === initial.eventFactor,
    )?.id;
  if (initial.indoor != null) initial.indoor = String(initial.indoor);
  if (initial.policeViolenceRisk != null)
    initial.policeViolenceRisk = String(initial.policeViolenceRisk);
  return (
    <div className="service-stack">
      <header className="service-section-header">
        <h2>Personalbedarf</h2>
        <Button disabled={locked} onClick={() => setOpen(true)}>
          {latest ? "Neu berechnen" : "Berechnen"}
        </Button>
      </header>
      <div className="service-method-field">
        <Field label="Berechnungsverfahren">
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value as typeof method)}
          >
            <option value="MAURER">Maurer</option>
            <option value="COLOGNE">Kölner Algorithmus</option>
          </select>
        </Field>
      </div>
      <Dialog
        title={method === "MAURER" ? "Maurer berechnen" : "Köln berechnen"}
        open={open}
        onClose={() => setOpen(false)}
        size="wide"
      >
        {open ? (
          <ServiceForm
            key={method}
            title={
              method === "MAURER"
                ? "Maurer: Eingaben"
                : "Köln: Eingaben und Raumplanung"
            }
            hideLegend
            fields={needFields(method, service.calculations.length > 0)}
            initial={initial}
            disabled={locked}
            submitLabel="Berechnungsstand speichern"
            onSubmit={async (values) => {
              await action.mutateAsync({
                path: `/${service.id}/calculations`,
                body: {
                  version: service.version,
                  method,
                  input: parseInput(values, method, zones),
                  reason: String(values.reason ?? ""),
                },
              });
              setOpen(false);
            }}
          >
            {method === "COLOGNE" ? (
              <CalculationZones zones={zones} onChange={setZones} />
            ) : null}
          </ServiceForm>
        ) : null}
      </Dialog>
      {latest ? (
        <AssessmentResult calculation={latest} />
      ) : (
        <p className="service-empty">Noch keine Berechnung.</p>
      )}
      {history.length ? (
        <details className="service-disclosure service-assessment-history">
          <summary>Frühere Berechnungen ({history.length})</summary>
          {history.map((calculation) => (
            <AssessmentResult key={calculation.id} calculation={calculation} />
          ))}
        </details>
      ) : null}
    </div>
  );
}
