/** Wire types: dates are ISO 8601 with offset; decimals are strings, EUR. */
export const serviceStatuses = [
  "INQUIRY",
  "PLANNING",
  "RELEASED",
  "ACTIVE",
  "REVIEW",
  "COMPLETED",
  "CANCELLED",
] as const;
export type ServiceStatus = (typeof serviceStatuses)[number];
export const qualifications = [
  "SANITARIAN",
  "RESCUE_HELPER",
  "PARAMEDIC",
  "EMERGENCY_PARAMEDIC",
  "PHYSICIAN",
] as const;
export type Qualification = (typeof qualifications)[number];
export type ServicePosition = {
  id: string;
  name: string;
  qualification: Qualification;
  leader: boolean;
  quantity: number;
  team: string | null;
};
export type ServiceAssignment = {
  id: string;
  personId: string;
  positionId: string;
  startsAt: string;
  endsAt: string;
  hourlyRate: string;
  actualStartsAt: string | null;
  actualEndsAt: string | null;
  qualification: Qualification;
};
export type ServiceReservation = {
  id: string;
  kind: "VEHICLE" | "KIT" | "DEVICE";
  resourceId: string;
  startsAt: string;
  endsAt: string;
};
export type ServiceTask = {
  id: string;
  title: string;
  responsibleId: string | null;
  dueAt: string | null;
  done: boolean;
};
export type ServiceCostLine = {
  id: string;
  label: string;
  category: "PERSONNEL" | "VEHICLE" | "MATERIAL" | "OTHER";
  unit: string;
  tariffId: string | null;
  plannedQuantity: string;
  actualQuantity: string | null;
  costRate: string;
  saleRate: string;
};
export type ServiceAdditionalCharge = {
  id: string;
  label: string;
  amount: string;
};
export type ServiceOutcome = {
  visitors: number | null;
  treatments: number | null;
  transports: number | null;
  emergencyPhysicians: number | null;
  conditions: string;
  notes: string;
};
export type ServiceWrite = {
  version?: number;
  title: string;
  eventType: string;
  customer: string;
  organizer: string;
  leadOrganization: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  location: string;
  eventStartsAt: string;
  eventEndsAt: string;
  startsAt: string;
  endsAt: string;
  responsibleId: string | null;
  description: string;
  requirements: string;
  supportOnly: boolean;
  agreedRevenue: string | null;
  materialDiscounted: boolean;
  materialRate: string;
  additionalCharges: ServiceAdditionalCharge[];
  positions: ServicePosition[];
  assignments: ServiceAssignment[];
  reservations: ServiceReservation[];
  tasks: ServiceTask[];
  lines: ServiceCostLine[];
  outcome: ServiceOutcome;
};
export type ServicePersonWrite = {
  version?: number;
  name: string;
  active: boolean;
  leader: boolean;
  userId: string | null;
  qualifications: {
    qualification: Qualification;
    validUntil: string | null;
    recognizedQualifications: Qualification[];
  }[];
};
export type ServiceVehicleWrite = {
  version?: number;
  name: string;
  registration: string;
  type: string;
  ready: boolean;
  notes: string;
  active: boolean;
};
export type ServiceTariffWrite = {
  version?: number;
  name: string;
  category: ServiceCostLine["category"];
  unit: string;
  costRate: string;
  saleRate: string;
  active: boolean;
};
export type ServiceChecklistWrite = {
  version?: number;
  name: string;
  tasks: string[];
  active: boolean;
};
export type ServiceWarning = {
  code: string;
  message: string;
  entityId: string | null;
};
export const emptyOutcome: ServiceOutcome = {
  visitors: null,
  treatments: null,
  transports: null,
  emergencyPhysicians: null,
  conditions: "",
  notes: "",
};
export type ServiceCosts = {
  currency: string;
  agreedRevenue: string | null;
  planned: { cost: string; revenue: string; result: string };
  actual: {
    complete: boolean;
    cost: string | null;
    revenue: string | null;
    knownCost: string;
    knownRevenue: string;
    result: string | null;
  };
};
export type ServiceDocumentView = {
  id: string;
  serviceId: string;
  filename: string;
  mimeType: string;
  sha256: string;
  size: number;
  createdBy: string;
  createdAt: string;
};
export type ServiceCalculationView = {
  id: string;
  serviceId: string;
  method: "MAURER" | "COLOGNE";
  methodVersion: string;
  sourceUrl: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  reason: string;
  createdBy: string;
  createdAt: string;
};
export type ServiceReleaseView = {
  id: string;
  serviceId: string;
  serviceVersion: number;
  snapshot: Record<string, unknown>;
  warnings: ServiceWarning[];
  reason: string;
  createdBy: string;
  createdAt: string;
};
export type ServiceView = ServiceWrite & {
  id: string;
  kind: "MEDICAL";
  status: ServiceStatus;
  version: number;
  warnings: ServiceWarning[];
  calculations: ServiceCalculationView[];
  releases: ServiceReleaseView[];
  documents: ServiceDocumentView[];
  costs: ServiceCosts;
  createdAt: string;
  updatedAt: string;
};
export type ServiceCatalog = {
  people: (ServicePersonWrite & { id: string; version: number })[];
  vehicles: (ServiceVehicleWrite & { id: string; version: number })[];
  tariffs: (ServiceTariffWrite & { id: string; version: number })[];
  checklists: (ServiceChecklistWrite & { id: string; version: number })[];
  kits: { id: string; name: string; status: string }[];
  devices: { id: string; name: string; kitId: string | null; status: string }[];
  users: { id: string; displayName: string }[];
};
export type ServiceCoverage = {
  requiredPersonnelMinutes: number;
  coveredPersonnelMinutes: number;
  occupancyRate: number | null;
  coverageBasis: "NOMINAL_ASSIGNMENTS";
};
export type ServiceStatisticRow = ServiceCoverage & {
  id: string;
  title: string;
  status: ServiceStatus;
  startsAt: string;
  eventType: string;
  customer: string;
  supportOnly: boolean;
  requiredPersonnel: number;
  assignedPersonnel: number;
  plannedMinutes: number;
  actualMinutes: number | null;
  actualTimeMissing: number;
  costs: ServiceCosts;
  outcome: ServiceOutcome;
  forecastComparable: boolean;
  forecasts: {
    method: string;
    createdAt: string;
    metrics: Record<string, number>;
  }[];
};
export type ServiceStatistics = {
  totals: ServiceCoverage & {
    services: number;
    requiredPersonnel: number;
    assignedPersonnel: number;
    occupancyRate: number | null;
    plannedMinutes: number;
    actualMinutes: number | null;
    actualTimeMissing: number;
    plannedCost: string | null;
    plannedRevenue: string | null;
    plannedResult: string | null;
    actualCost: string | null;
    actualRevenue: string | null;
    actualResult: string | null;
    medical: Record<
      "visitors" | "treatments" | "transports" | "emergencyPhysicians",
      { total: number | null; knownTotal: number; missing: number }
    >;
  };
  qualifications: {
    qualification: Qualification;
    plannedMinutes: number;
    actualMinutes: number | null;
    actualTimeMissing: number;
  }[];
  rows: ServiceStatisticRow[];
};
