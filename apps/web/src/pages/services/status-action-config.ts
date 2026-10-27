import type { ServiceStatus } from "./types";
export const statusTransitions: Record<ServiceStatus, ServiceStatus[]> = {
  INQUIRY: ["PLANNING", "CANCELLED"],
  PLANNING: ["RELEASED", "CANCELLED"],
  RELEASED: ["ACTIVE", "PLANNING", "CANCELLED"],
  ACTIVE: ["REVIEW", "CANCELLED"],
  REVIEW: ["COMPLETED", "PLANNING", "CANCELLED"],
  COMPLETED: ["REVIEW"],
  CANCELLED: ["PLANNING"],
};
const nextSteps: Record<ServiceStatus, { label: string; title: string }> = {
  INQUIRY: { label: "Planung starten", title: "Planung starten" },
  PLANNING: { label: "Freigeben", title: "Dienst freigeben" },
  RELEASED: { label: "Dienst beginnen", title: "Dienst beginnen" },
  ACTIVE: { label: "Nachbereiten", title: "Nachbereitung beginnen" },
  REVIEW: { label: "Abschließen", title: "Dienst abschließen" },
  COMPLETED: { label: "Korrektur öffnen", title: "Korrektur öffnen" },
  CANCELLED: { label: "Planung öffnen", title: "Planung öffnen" },
};
export function nextStatusAction(status: ServiceStatus) {
  return { status: statusTransitions[status][0]!, ...nextSteps[status] };
}
export function transitionLabel(from: ServiceStatus, to: ServiceStatus) {
  return nextStatusAction(from).status === to
    ? nextSteps[from].label
    : to === "CANCELLED"
      ? "Dienst absagen"
      : "Zur Planung zurückkehren";
}
