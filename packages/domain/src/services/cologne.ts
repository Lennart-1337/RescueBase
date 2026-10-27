import { createAssessment } from "./assessment.js";
import {
  calculateCologneZones,
  validateCologneZones,
} from "./cologne-zones.js";
import type { CologneInput, StaffingAssessment } from "./types.js";
import { missingFields, validateOptionalNumber } from "./validation.js";

const required = [
  "durationHours",
  "expectedVisitors",
  "riskFactor",
  "responseTimeMinutes",
  "crowdMovement",
  "regularAmbulanceTransports",
  "regularEmergencyDoctorCalls",
  "ambulanceBusyHours",
  "emergencyDoctorBusyHours",
  "zones",
] as const;
export function calculateCologne(input: CologneInput): StaffingAssessment {
  for (const field of [
    "durationHours",
    "riskFactor",
    "responseTimeMinutes",
    "ambulanceBusyHours",
    "emergencyDoctorBusyHours",
  ] as const) {
    validateOptionalNumber(input[field], field, Number.MIN_VALUE);
  }
  validateOptionalNumber(input.expectedVisitors, "expectedVisitors", 1, true);
  validateOptionalNumber(
    input.regularAmbulanceTransports,
    "regularAmbulanceTransports",
  );
  validateOptionalNumber(
    input.regularEmergencyDoctorCalls,
    "regularEmergencyDoctorCalls",
  );
  if (
    input.crowdMovement != null &&
    !["SEATED", "STANDING", "DENSE"].includes(input.crowdMovement)
  ) {
    throw new Error("Unknown crowdMovement.");
  }
  validateCologneZones(input);
  const result = createAssessment("COLOGNE", missingFields(input, required));
  result.warnings.push(
    "GEOGRAPHY_AND_ZONE_COVERAGE_REQUIRE_REVIEW",
    "SOURCE_TABLE_CONTAINS_AMBIGUOUS_THRESHOLDS",
  );
  if (result.status === "INCOMPLETE") return result;
  const values = input as Required<CologneInput>;
  const presentationsPerHour =
    values.expectedVisitors * values.riskFactor * 0.0002;
  const expectedPresentations = presentationsPerHour * values.durationHours;
  const expectedAmbulanceTransports = expectedPresentations * 0.2;
  // The 2010 worked example resolves the ambiguous 2007 NEF row: 10% of RTW transports.
  const expectedEmergencyDoctorCalls = expectedAmbulanceTransports * 0.1;
  const rtw = Math.ceil(
    (Math.max(
      0,
      expectedAmbulanceTransports - values.regularAmbulanceTransports,
    ) *
      values.ambulanceBusyHours) /
      values.durationHours,
  );
  const emergencyDoctors = Math.ceil(
    (Math.max(
      0,
      expectedEmergencyDoctorCalls - values.regularEmergencyDoctorCalls,
    ) *
      values.emergencyDoctorBusyHours) /
      values.durationHours,
  );
  const speed = { SEATED: 100, STANDING: 50, DENSE: 25 }[values.crowdMovement];
  result.metrics = {
    presentationsPerHour,
    expectedPresentations,
    expectedAmbulanceTransports,
    expectedEmergencyDoctorCalls,
    maximumWalkingDistanceMeters: values.responseTimeMinutes * speed,
  };
  if (
    Object.values(result.metrics).some((value) => !Number.isFinite(value)) ||
    !Number.isSafeInteger(rtw) ||
    !Number.isSafeInteger(emergencyDoctors)
  )
    throw new Error("Calculation exceeds numeric range.");
  result.steps = [
    {
      key: "expectedPresentations",
      value: expectedPresentations,
      formula: "expectedVisitors × riskFactor × 0.0002 × durationHours",
    },
    {
      key: "expectedAmbulanceTransports",
      value: expectedAmbulanceTransports,
      formula: "expectedPresentations × 0.2",
    },
    {
      key: "expectedEmergencyDoctorCalls",
      value: expectedEmergencyDoctorCalls,
      formula: "expectedAmbulanceTransports × 0.1",
    },
    {
      key: "rtw",
      value: rtw,
      formula:
        "ceil(max(0, expectedAmbulanceTransports − regularAmbulanceTransports) × ambulanceBusyHours / durationHours)",
    },
    {
      key: "emergencyDoctors",
      value: emergencyDoctors,
      formula:
        "ceil(max(0, expectedEmergencyDoctorCalls − regularEmergencyDoctorCalls) × emergencyDoctorBusyHours / durationHours)",
    },
  ];
  result.zones = calculateCologneZones(values);
  const zoneTotal = (
    role: keyof NonNullable<typeof result.zones>[number]["staffing"],
  ) => result.zones!.reduce((sum, zone) => sum + zone.staffing[role], 0);
  result.recommendation = {
    helpers: zoneTotal("helpers"),
    paramedics: zoneTotal("paramedics"),
    advancedProviders: zoneTotal("advancedProviders"),
    ktw: 0,
    rtw,
    emergencyDoctors: emergencyDoctors + zoneTotal("emergencyDoctors"),
    command: "UNDETERMINED",
    additionalCrewRequired: true,
  };
  result.metrics.additionalEmergencyDoctorVehicles = emergencyDoctors;
  result.warnings.push(
    "ZONE_RESPONSE_TEAMS_AND_STATIONS_ADDITIONAL",
    "COMMAND_NOT_DETERMINED_BY_FREQUENCY_MODEL",
  );
  if (values.expectedVisitors < 100000 || values.durationHours < 10)
    result.warnings.push("OUTSIDE_REFERENCE_POPULATION");
  if (result.zones.some((zone) => zone.presentationsPerHour >= 10))
    result.warnings.push("HIGH_FREQUENCY_ZONE_REQUIRES_INDIVIDUAL_REVIEW");
  return result;
}
