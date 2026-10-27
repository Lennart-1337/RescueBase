import { cologneFields, maurerFields } from "./calculation-fields";
import { factorFields } from "./calculation-input";
import type { ServiceField } from "./form";
export function needFields(
  method: "MAURER" | "COLOGNE",
  hasCalculations: boolean,
): ServiceField[] {
  const group = (name: string) => {
    if (method === "MAURER")
      return ["protectedVipCount", "policeViolenceRisk"].includes(name)
        ? "Besondere Risiken"
        : "Veranstaltung";
    if (factorFields.includes(name)) return "Risikofaktoren";
    if (
      [
        "regularAmbulanceTransports",
        "regularEmergencyDoctorCalls",
        "ambulanceBusyHours",
        "emergencyDoctorBusyHours",
      ].includes(name)
    )
      return "Rettungsdienst";
    return [
      "responseTimeMinutes",
      "crowdMovement",
      "coverageDescription",
    ].includes(name)
      ? "Schutzziel und Gelände"
      : "Veranstaltung";
  };
  return [
    ...(method === "MAURER" ? maurerFields : cologneFields).map((field) => ({
      ...field,
      hint: undefined,
      group: group(field.name),
    })),
    {
      name: "reason",
      label: "Änderungsgrund",
      group: "Berechnungsstand",
      type: "textarea",
      required: hasCalculations,
    },
  ];
}
