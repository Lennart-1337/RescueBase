import { MAURER_EVENT_FACTORS } from "@rescuebase/domain";
import type { Values } from "./form";
export type Zone = {
  key: string;
  id: string;
  expectedVisitors: string;
  riskFactor: string;
};
export const factorFields = [
  "weatherFactor",
  "audienceFactor",
  "crowdFactor",
  "venueFactor",
  "experienceFactor",
];
export function parseInput(values: Values, method: string, zones: Zone[]) {
  const input: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value == null || key === "reason") continue;
    input[key] = ["indoor", "policeViolenceRisk"].includes(key)
      ? value === "true"
      : typeof value === "string" &&
          key !== "crowdMovement" &&
          key !== "coverageDescription" &&
          key !== "eventCategory"
        ? Number(value.replace(",", "."))
        : value;
  }
  if (method === "MAURER" && input.eventCategory)
    input.eventFactor = MAURER_EVENT_FACTORS.find(
      (event) => event.id === input.eventCategory,
    )?.factor;
  if (
    Object.values(input).some(
      (value) => typeof value === "number" && !Number.isFinite(value),
    )
  )
    throw new Error("Bitte gültige Zahlen eingeben.");
  if (method === "COLOGNE") {
    const bounds = [2, 2, 10, 5, Infinity];
    factorFields.forEach((key, index) => {
      if (
        input[key] != null &&
        (Number(input[key]) < 1 || Number(input[key]) > bounds[index]!)
      )
        throw new Error(
          "Ein Risikofaktor liegt außerhalb des angegebenen Wertebereichs.",
        );
    });
    const factors = factorFields.map((key) => input[key]);
    if (factors.every((value) => typeof value === "number"))
      input.riskFactor = factors.reduce<number>(
        (product, value) => product * Number(value),
        1,
      );
    if (zones.length)
      input.zones = zones.map(({ id, expectedVisitors, riskFactor }) => ({
        id,
        expectedVisitors: Number(expectedVisitors),
        riskFactor: Number(riskFactor.replace(",", ".")),
      }));
  }
  return input;
}
