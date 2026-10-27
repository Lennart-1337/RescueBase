export interface MaurerInput {
  capacity?: number;
  expectedVisitors?: number;
  indoor?: boolean;
  eventFactor?: number;
  protectedVipCount?: number;
  policeViolenceRisk?: boolean;
}
export interface CologneZoneInput {
  id: string;
  expectedVisitors: number;
  riskFactor: number;
}
export interface CologneInput {
  durationHours?: number;
  expectedVisitors?: number;
  riskFactor?: number;
  responseTimeMinutes?: number;
  crowdMovement?: "SEATED" | "STANDING" | "DENSE";
  regularAmbulanceTransports?: number;
  regularEmergencyDoctorCalls?: number;
  ambulanceBusyHours?: number;
  emergencyDoctorBusyHours?: number;
  zones?: CologneZoneInput[];
}
export interface TreatmentStation {
  treatmentPlaces: number;
  restPlaces: number;
  emergencyDoctors: number;
  advancedProviders: number;
  paramedics: number;
  helpers: number;
}
export interface StaffingRecommendation {
  helpers: number;
  ktw: number;
  rtw: number;
  emergencyDoctors: number;
  paramedics?: number;
  advancedProviders?: number;
  command: "NONE" | "REDUCED_STAFF" | "FULL_STAFF" | "UNDETERMINED";
  treatmentStation?: TreatmentStation;
  additionalCrewRequired: boolean;
}
export interface CologneZoneResult {
  id: string;
  presentationsPerHour: number;
  responseTeamCount: number;
  treatmentStation?: "MOBILE_1_1" | "UHS_1_5" | "UHS_1_1_8";
  considerAdditionalHelperTeam: boolean;
  staffing: {
    helpers: number;
    paramedics: number;
    advancedProviders: number;
    emergencyDoctors: number;
  };
}
export interface CalculationStep {
  key: string;
  value: number;
  formula: string;
}
export interface StaffingAssessment {
  method: "MAURER" | "COLOGNE";
  methodVersion: string;
  sourceUrls: string[];
  status: "COMPLETE" | "INCOMPLETE";
  missingFields: string[];
  warnings: string[];
  requiresProfessionalReview: true;
  metrics: Record<string, number>;
  steps: CalculationStep[];
  recommendation?: StaffingRecommendation;
  zones?: CologneZoneResult[];
}
