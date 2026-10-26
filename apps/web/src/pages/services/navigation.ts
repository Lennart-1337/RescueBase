export const serviceTabs = [
  { value: "overview", label: "Übersicht" },
  { value: "need", label: "Bedarf" },
  { value: "personnel", label: "Personal" },
  { value: "resources", label: "Ressourcen" },
  { value: "preparation", label: "Vorbereitung" },
  { value: "outcome", label: "Nachbereitung" },
  { value: "finance", label: "Kalkulation" },
] as const;
export type ServiceTab = (typeof serviceTabs)[number]["value"];
export const serviceViews = [
  { value: "list", label: "Dienste" },
  { value: "statistics", label: "Statistik" },
  { value: "people", label: "Personal" },
  { value: "vehicles", label: "Fahrzeuge" },
  { value: "tariffs", label: "Tarife" },
  { value: "checklists", label: "Vorbereitungslisten" },
] as const;
export type ServiceView = (typeof serviceViews)[number]["value"];
