import { MAURER_EVENT_FACTORS } from "@rescuebase/domain";
import { number, type ServiceField } from "./form";
const booleanChoice = (name: string, label: string): ServiceField => ({
  name,
  label,
  options: [
    { value: "true", label: "Ja" },
    { value: "false", label: "Nein" },
  ],
});
export const maurerFields: ServiceField[] = [
  number("capacity", "Maximal zulässige Besucherzahl"),
  number("expectedVisitors", "Erwartete Besucherzahl"),
  booleanChoice("indoor", "Veranstaltung im Gebäude"),
  {
    name: "eventCategory",
    label: "Veranstaltungsart für Maurer",
    options: MAURER_EVENT_FACTORS.map((event) => ({
      value: event.id,
      label: `${event.label} (Faktor ${event.factor})`,
    })),
  },
  number("protectedVipCount", "Prominente Personen mit Sicherheitsstufe"),
  booleanChoice(
    "policeViolenceRisk",
    "Polizeiliche Erkenntnisse zu Gewaltbereitschaft",
  ),
];
export const cologneFields: ServiceField[] = [
  number("expectedVisitors", "Erwartete Besucherzahl"),
  {
    name: "durationHours",
    label: "Veranstaltungsdauer einschließlich Zu-/Abstrom (Stunden)",
    type: "decimal",
  },
  {
    name: "responseTimeMinutes",
    label: "Abgestimmtes Schutzziel: Zugriffszeit (Minuten)",
    type: "decimal",
    hint: "Kein vorgegebener allgemeiner NRW-Standard; örtlich fachlich festlegen.",
  },
  {
    name: "crowdMovement",
    label: "Beweglichkeit im Publikum",
    options: [
      { value: "SEATED", label: "Sitzend / freie Wege (100 m/min)" },
      { value: "STANDING", label: "Stehend (50 m/min)" },
      { value: "DENSE", label: "Dicht gedrängt (25 m/min)" },
    ],
  },
  ...[
    { name: "weatherFactor", label: "Wetterfaktor (1–2)" },
    { name: "audienceFactor", label: "Publikumsfaktor (1–2)" },
    {
      name: "crowdFactor",
      label: "Ballung / Massenphänomene (1–5; Marathon bis 10)",
    },
    { name: "venueFactor", label: "Versammlungsstätte (1–5)" },
    {
      name: "experienceFactor",
      label: "Faktor aus eigenen Erfahrungen (ab 1)",
    },
  ].map((field) => ({ ...field, type: "decimal" as const })),
  number(
    "regularAmbulanceTransports",
    "Abgestimmte zusätzliche RTW-Transporte des Regelrettungsdienstes",
  ),
  number(
    "regularEmergencyDoctorCalls",
    "Abgestimmte zusätzliche Notarzteinsätze des Regelrettungsdienstes",
  ),
  {
    name: "ambulanceBusyHours",
    label: "Durchschnittliche RTW-Bindungsdauer (Stunden)",
    type: "decimal",
  },
  {
    name: "emergencyDoctorBusyHours",
    label: "Durchschnittliche Notarzt-Bindungsdauer (Stunden)",
    type: "decimal",
  },
  {
    name: "coverageDescription",
    label: "Gelände, Erreichbarkeit und Begründung der Wachbezirke",
    type: "textarea",
  },
];
export const calculationLabels: Record<string, string> = {
  capacity: "Zulässige Besucherzahl",
  expectedVisitors: "Erwartete Besucherzahl",
  indoor: "Gebäude",
  eventFactor: "Veranstaltungsfaktor",
  protectedVipCount: "Geschützte Personen",
  policeViolenceRisk: "Polizeiliche Erkenntnisse",
  durationHours: "Veranstaltungsdauer",
  riskFactor: "Risikofaktor",
  responseTimeMinutes: "Zugriffszeit",
  crowdMovement: "Beweglichkeit",
  regularAmbulanceTransports: "Zusätzliche RTW-Transporte",
  regularEmergencyDoctorCalls: "Zusätzliche Notarzteinsätze",
  ambulanceBusyHours: "RTW-Bindungsdauer",
  emergencyDoctorBusyHours: "Notarzt-Bindungsdauer",
  zones: "Wachbezirke",
  capacityScore: "Punkte aus Kapazität",
  visitorScore: "Punkte aus Besucherzahl",
  vipScore: "Punkte aus geschützten Personen",
  score: "Gesamtrisiko",
  expectedPresentations: "Erwartete Hilfeleistungen",
  expectedAmbulanceTransports: "Erwartete RTW-Transporte",
  expectedEmergencyDoctorCalls: "Erwartete Notarzteinsätze",
  rtw: "Zusätzliche RTW",
  emergencyDoctors: "Zusätzliche Notarztmittel",
  individualAssessmentAbove140Points:
    "Individuelle Bemessung über 140 Punkten erforderlich",
};
