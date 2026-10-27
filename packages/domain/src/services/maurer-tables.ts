import type { StaffingRecommendation, TreatmentStation } from "./types.js";

// Published interval end points are inclusive. Values between printed decimal
// boundaries enter the next band; no prior rounding can lower the recommendation.
function band(score: number, limits: number[], values: number[]): number {
  return values[limits.findIndex((limit) => score <= limit)]!;
}
export function maurerResources(score: number): StaffingRecommendation {
  return {
    helpers: band(
      score,
      [2, 4, 13.5, 22, 40, 60, 80, 100, 110, 120, 140],
      [0, 3, 5, 10, 20, 30, 40, 80, 100, 120, 160],
    ),
    ktw: band(
      score,
      [4, 13, 25, 40, 60, 80, 100, 110, 120, 140],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 10],
    ),
    rtw: band(
      score,
      [6, 25.5, 45.5, 60.5, 75.5, 100, 120, 140],
      [0, 1, 2, 3, 4, 5, 6, 7],
    ),
    emergencyDoctors: band(
      score,
      [13, 30, 60, 90, 120, 140],
      [0, 1, 2, 3, 4, 5],
    ),
    command:
      score <= 30 ? "NONE" : score <= 60 ? "REDUCED_STAFF" : "FULL_STAFF",
    treatmentStation: station(score),
    additionalCrewRequired: true,
  };
}
function station(score: number): TreatmentStation | undefined {
  if (score <= 50) return undefined;
  if (score <= 80)
    return {
      treatmentPlaces: 5,
      restPlaces: 10,
      emergencyDoctors: 1,
      advancedProviders: 1,
      paramedics: 5,
      helpers: 5,
    };
  if (score <= 110)
    return {
      treatmentPlaces: 5,
      restPlaces: 20,
      emergencyDoctors: 1,
      advancedProviders: 1,
      paramedics: 5,
      helpers: 10,
    };
  return {
    treatmentPlaces: 8,
    restPlaces: 25,
    emergencyDoctors: 2,
    advancedProviders: 2,
    paramedics: 8,
    helpers: 12,
  };
}
export function capacityPoints(capacity: number): number {
  const index = [500, 1000, 1500, 3000, 6000, 10000, 20000].findIndex(
    (limit) => capacity <= limit,
  );
  return index >= 0 ? index + 1 : 7 + Math.ceil((capacity - 20000) / 10000);
}
