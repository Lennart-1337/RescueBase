import type { CologneInput, CologneZoneResult } from "./types.js";
import { assertNumber } from "./validation.js";

export function validateCologneZones(input: CologneInput): void {
  if (input.zones == null) return;
  if (!Array.isArray(input.zones) || input.zones.length === 0)
    throw new Error("zones must not be empty.");
  const ids = new Set<string>();
  for (const zone of input.zones) {
    if (
      !zone ||
      typeof zone.id !== "string" ||
      !zone.id.trim() ||
      ids.has(zone.id)
    ) {
      throw new Error("zones require unique non-empty IDs.");
    }
    ids.add(zone.id);
    assertNumber(zone.expectedVisitors, "zone.expectedVisitors", 0, true);
    assertNumber(zone.riskFactor, "zone.riskFactor", Number.MIN_VALUE);
  }
  if (
    input.expectedVisitors != null &&
    input.zones.reduce((sum, zone) => sum + zone.expectedVisitors, 0) !==
      input.expectedVisitors
  ) {
    throw new Error("Zone visitors must sum to expectedVisitors.");
  }
}
export function calculateCologneZones(
  input: Required<CologneInput>,
): CologneZoneResult[] {
  return input.zones.map((zone) => {
    const presentationsPerHour =
      zone.expectedVisitors * zone.riskFactor * 0.0002;
    const stationStaff =
      presentationsPerHour >= 10
        ? [5, 2, 1, 1]
        : presentationsPerHour >= 8
          ? [3, 1, 0, 0]
          : presentationsPerHour >= 4
            ? [1, 1, 0, 0]
            : [0, 0, 0, 0];
    return {
      id: zone.id,
      presentationsPerHour,
      responseTeamCount: 1,
      staffing: {
        helpers: 1 + stationStaff[0]!,
        paramedics: 1 + stationStaff[1]!,
        advancedProviders: stationStaff[2]!,
        emergencyDoctors: stationStaff[3]!,
      },
      treatmentStation:
        presentationsPerHour >= 10
          ? "UHS_1_1_8"
          : presentationsPerHour >= 8
            ? "UHS_1_5"
            : presentationsPerHour >= 4
              ? "MOBILE_1_1"
              : undefined,
      considerAdditionalHelperTeam: presentationsPerHour >= 6,
    };
  });
}
