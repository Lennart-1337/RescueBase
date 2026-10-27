import { ServiceForm, number } from "./form";
import type { ServiceEditorProps } from "./editor";
import type { ServiceOutcome } from "./types";
export function Outcome({ service, save, locked }: ServiceEditorProps) {
  return (
    <ServiceForm
      title="Nachbereitung"
      disabled={locked}
      fields={[
        number("visitors", "Besucher"),
        number("treatments", "Hilfeleistungen"),
        number("transports", "Transporte"),
        number("emergencyPhysicians", "Notarztnachforderungen"),
        {
          name: "conditions",
          label: "Wetter und Bedingungen",
          type: "textarea",
        },
        {
          name: "notes",
          label: "Nachbesprechung (ohne Patientendaten)",
          type: "textarea",
        },
      ]}
      initial={service.outcome}
      onSubmit={(values) =>
        save({
          outcome: {
            ...values,
            conditions: String(values.conditions ?? ""),
            notes: String(values.notes ?? ""),
          } as ServiceOutcome,
        })
      }
    />
  );
}
