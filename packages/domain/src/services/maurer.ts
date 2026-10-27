import { createAssessment } from "./assessment.js";
import { capacityPoints, maurerResources } from "./maurer-tables.js";
import type { MaurerInput, StaffingAssessment } from "./types.js";
import {
  missingFields,
  validateOptionalBoolean,
  validateOptionalNumber,
} from "./validation.js";

export function calculateMaurer(input: MaurerInput): StaffingAssessment {
  for (const field of [
    "capacity",
    "expectedVisitors",
    "protectedVipCount",
  ] as const) {
    validateOptionalNumber(
      input[field],
      field,
      field === "protectedVipCount" ? 0 : 1,
      true,
    );
  }
  validateOptionalNumber(input.eventFactor, "eventFactor", Number.MIN_VALUE);
  validateOptionalBoolean(input.indoor, "indoor");
  validateOptionalBoolean(input.policeViolenceRisk, "policeViolenceRisk");
  if (
    input.capacity != null &&
    input.expectedVisitors != null &&
    input.expectedVisitors > input.capacity
  ) {
    throw new Error("expectedVisitors must not exceed capacity.");
  }
  const result = createAssessment(
    "MAURER",
    missingFields(input, [
      "capacity",
      "expectedVisitors",
      "indoor",
      "eventFactor",
      "protectedVipCount",
      "policeViolenceRisk",
    ]),
  );
  if (result.status === "INCOMPLETE") return result;
  const complete = input as Required<MaurerInput>;
  const capacityScore =
    capacityPoints(complete.capacity) * (complete.indoor ? 2 : 1);
  const visitorScore = Math.floor(complete.expectedVisitors / 500);
  // Willich 2007 states 10 points per five protected VIPs, capped at 30.
  // Proportional interpretation is explicit; the source gives no group rounding.
  const vipScore = Math.min(30, complete.protectedVipCount * 2);
  const policeScore = complete.policeViolenceRisk ? 10 : 0;
  const score =
    (capacityScore + visitorScore) * complete.eventFactor +
    vipScore +
    policeScore;
  if (!Number.isFinite(score)) throw new Error("score exceeds numeric range.");
  result.metrics = {
    capacityScore,
    visitorScore,
    vipScore,
    policeScore,
    score,
  };
  result.steps = [
    {
      key: "capacityScore",
      value: capacityScore,
      formula: "capacityTable(capacity) × (indoor ? 2 : 1)",
    },
    {
      key: "visitorScore",
      value: visitorScore,
      formula: "floor(expectedVisitors / 500)",
    },
    {
      key: "vipScore",
      value: vipScore,
      formula:
        "min(30, protectedVipCount × 2) [Willich 2007; proportional interpretation]",
    },
    {
      key: "score",
      value: score,
      formula:
        "(capacityScore + visitorScore) × eventFactor + vipScore + policeScore",
    },
  ];
  result.warnings.push(
    "MAURER_DOES_NOT_MODEL_GEOGRAPHY_OR_WEATHER",
    "RESOURCE_TABLE_UPPER_HELPER_RANGE_USED",
  );
  if (complete.protectedVipCount % 5 !== 0)
    result.warnings.push("VIP_PROPORTIONAL_INTERPRETATION_REQUIRES_REVIEW");
  if (score > 140) {
    result.status = "INCOMPLETE";
    result.missingFields.push("individualAssessmentAbove140Points");
    result.warnings.push("OUTSIDE_RESOURCE_TABLE");
  } else result.recommendation = maurerResources(score);
  return result;
}
