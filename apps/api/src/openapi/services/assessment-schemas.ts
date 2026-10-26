import {
  array,
  boolean,
  enumeration,
  integer,
  object,
  ref,
  string,
} from "./helpers.js";
const number = { type: "number", minimum: 0 };
const staffing = {
  helpers: integer,
  paramedics: integer,
  advancedProviders: integer,
  emergencyDoctors: integer,
};
export const serviceAssessmentSchemas = {
  MaurerInput: object(
    {
      eventCategory: string,
      capacity: integer,
      expectedVisitors: integer,
      indoor: boolean,
      eventFactor: number,
      protectedVipCount: integer,
      policeViolenceRisk: boolean,
    },
    [],
  ),
  CologneZone: object({
    id: string,
    expectedVisitors: integer,
    riskFactor: number,
  }),
  CologneInput: object(
    {
      durationHours: number,
      expectedVisitors: integer,
      riskFactor: number,
      responseTimeMinutes: number,
      crowdMovement: enumeration(["SEATED", "STANDING", "DENSE"]),
      regularAmbulanceTransports: number,
      regularEmergencyDoctorCalls: number,
      ambulanceBusyHours: number,
      emergencyDoctorBusyHours: number,
      zones: array(ref("CologneZone")),
      weatherFactor: number,
      audienceFactor: number,
      crowdFactor: number,
      venueFactor: number,
      experienceFactor: number,
      coverageDescription: string,
    },
    [],
  ),
  ServiceAssessment: object(
    {
      method: enumeration(["MAURER", "COLOGNE"]),
      methodVersion: string,
      sourceUrls: array(string),
      status: enumeration(["COMPLETE", "INCOMPLETE"]),
      missingFields: array(string),
      warnings: array(string),
      requiresProfessionalReview: boolean,
      steps: array(
        object({ key: string, value: { type: "number" }, formula: string }),
      ),
      recommendation: object(
        {
          ...staffing,
          ktw: integer,
          rtw: integer,
          command: enumeration([
            "NONE",
            "REDUCED_STAFF",
            "FULL_STAFF",
            "UNDETERMINED",
          ]),
          additionalCrewRequired: boolean,
          treatmentStation: object({
            ...staffing,
            treatmentPlaces: integer,
            restPlaces: integer,
          }),
        },
        [
          "helpers",
          "ktw",
          "rtw",
          "emergencyDoctors",
          "command",
          "additionalCrewRequired",
        ],
      ),
      metrics: { type: "object", additionalProperties: { type: "number" } },
      zones: array(
        object(
          {
            id: string,
            presentationsPerHour: number,
            responseTeamCount: integer,
            treatmentStation: enumeration([
              "MOBILE_1_1",
              "UHS_1_5",
              "UHS_1_1_8",
            ]),
            considerAdditionalHelperTeam: boolean,
            staffing: object(staffing),
          },
          [
            "id",
            "presentationsPerHour",
            "responseTeamCount",
            "considerAdditionalHelperTeam",
            "staffing",
          ],
        ),
      ),
    },
    [
      "method",
      "methodVersion",
      "sourceUrls",
      "status",
      "missingFields",
      "warnings",
      "steps",
      "requiresProfessionalReview",
      "metrics",
    ],
  ),
  ServiceCalculationWrite: object(
    {
      version: integer,
      method: enumeration(["MAURER", "COLOGNE"]),
      input: { oneOf: [ref("MaurerInput"), ref("CologneInput")] },
      reason: string,
    },
    ["version", "method", "input"],
  ),
};
