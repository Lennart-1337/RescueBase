import type { StaffingAssessment } from "./types.js";
export const MAURER_SOURCE =
  "https://www.vfdb.de/media/doc/sonstiges/forschung/eva/vergleich_maurer_koelner_algorithmus.pdf";
export const COLOGNE_SOURCE =
  "https://www.vfdb.de/media/doc/sonstiges/forschung/eva/vfdb_koelneralgorithmus2007.pdf";
export const MAURER_LOCAL_SOURCE =
  "https://ris.stadt-willich.de/sdnetrim/UGhVM0hpd2NXNFdFcExjZWscsMhv5eB-M1uCc-f5hdEy4aW5Fg3phZtIH5Re52Mp/Sitzungsvorlage_alt2_07-1329.pdf";
export const MAURER_TABLE_SOURCE =
  "https://www.ur.ch/_docn/407416/IVR_RL_Sanitaetsdienst_bei_Veranstaltungen_Ausgabe_2017.pdf";
export function createAssessment(
  method: StaffingAssessment["method"],
  missing: string[],
): StaffingAssessment {
  return {
    method,
    methodVersion:
      method === "MAURER"
        ? "MAURER_WILLICH_2007_IVR_2017_V1"
        : "COLOGNE_VFDB_2007_V1",
    sourceUrls:
      method === "MAURER"
        ? [MAURER_LOCAL_SOURCE, MAURER_SOURCE, MAURER_TABLE_SOURCE]
        : [COLOGNE_SOURCE, MAURER_SOURCE],
    status: missing.length ? "INCOMPLETE" : "COMPLETE",
    missingFields: missing,
    warnings: [
      "PROFESSIONAL_REVIEW_REQUIRED",
      "ADDITIONAL_CREWS_COMMAND_AND_RELIEF_REQUIRED",
    ],
    requiresProfessionalReview: true,
    metrics: {},
    steps: [],
  };
}
