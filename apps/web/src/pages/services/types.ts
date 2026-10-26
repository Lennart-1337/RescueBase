import type { components } from "../../lib/generated-api";
type Schema = components["schemas"];
export const serviceStatuses = [
  "INQUIRY",
  "PLANNING",
  "RELEASED",
  "ACTIVE",
  "REVIEW",
  "COMPLETED",
  "CANCELLED",
] as const;
export const qualifications = [
  "SANITARIAN",
  "RESCUE_HELPER",
  "PARAMEDIC",
  "EMERGENCY_PARAMEDIC",
  "PHYSICIAN",
] as const;
export type ServiceStatus = Schema["ServiceStatus"];
export type Qualification = Schema["ServiceQualification"];
export type ServicePosition = Schema["ServicePosition"];
export type ServiceAssignment = Schema["ServiceAssignment"];
export type ServiceReservation = Schema["ServiceReservation"];
export type ServiceTask = Schema["ServiceTask"];
export type ServiceCostLine = Schema["ServiceCostLine"];
export type ServiceOutcome = Schema["ServiceOutcome"];
export type ServiceWarning = Schema["ServiceWarning"];
export type ServiceWrite = Required<Schema["ServiceWrite"]> & {
  version?: number;
};
export type ServicePersonWrite = Omit<
  Required<Schema["ServicePersonWrite"]>,
  "version"
> & { version?: number };
export type ServiceVehicleWrite = Omit<
  Required<Schema["ServiceVehicleWrite"]>,
  "version"
> & { version?: number };
export type ServiceTariffWrite = Omit<
  Required<Schema["ServiceTariffWrite"]>,
  "version"
> & { version?: number };
export type ServiceChecklistWrite = Omit<
  Required<Schema["ServiceChecklistWrite"]>,
  "version"
> & { version?: number };
export const emptyOutcome: ServiceOutcome = {
  visitors: null,
  treatments: null,
  transports: null,
  emergencyPhysicians: null,
  conditions: "",
  notes: "",
};
export type Person = Schema["ServicePerson"];
export type Vehicle = Schema["ServiceVehicle"];
export type Tariff = Schema["ServiceTariff"];
export type Checklist = Schema["ServiceChecklist"];
export type ResourceOption = Schema["ServiceResourceOption"];
export type Catalog = Schema["ServiceCatalog"];
export type Assessment = Schema["ServiceAssessment"];
export type Calculation = Schema["ServiceCalculation"];
export type Release = Schema["ServiceRelease"];
export type Document = Schema["ServiceDocument"];
export type Costs = Schema["ServiceCosts"];
export type Service = Schema["ServiceRecord"];
export type ServiceStatistics = Schema["ServiceStatistics"];
export const qualificationLabels: Record<Qualification, string> = {
  SANITARIAN: "Sanitäter",
  RESCUE_HELPER: "Rettungshelfer",
  PARAMEDIC: "Rettungssanitäter",
  EMERGENCY_PARAMEDIC: "Notfallsanitäter",
  PHYSICIAN: "Arzt",
};
export const statusLabels: Record<ServiceStatus, string> = {
  INQUIRY: "Anfrage",
  PLANNING: "Planung",
  RELEASED: "Freigegeben",
  ACTIVE: "Durchführung",
  REVIEW: "Nachbereitung",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgesagt",
};
export const categoryLabels = {
  PERSONNEL: "Personal",
  VEHICLE: "Fahrzeug",
  MATERIAL: "Material",
  OTHER: "Sonstiges",
};

export type ServiceStatisticRow = Schema["ServiceStatisticRow"];
