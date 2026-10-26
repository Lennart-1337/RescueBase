import {
  array,
  boolean,
  date,
  decimal,
  integer,
  nullable,
  object,
  ref,
  string,
} from "./helpers.js";
const money = nullable(decimal),
  signedMoney = nullable(string);
const coverage = {
  requiredPersonnelMinutes: integer,
  coveredPersonnelMinutes: integer,
  breakCoverageUncertain: boolean,
  coverageBasis: { type: "string", enum: ["NOMINAL_ASSIGNMENTS"] },
  occupancyRate: nullable({ type: "number", minimum: 0, maximum: 1 }),
};
const medical = object({
  total: nullable(integer),
  knownTotal: integer,
  missing: integer,
});
export const serviceStatisticsSchemas = {
  ServiceStatistics: object({
    totals: object({
      ...coverage,
      services: integer,
      requiredPersonnel: integer,
      assignedPersonnel: integer,
      plannedMinutes: integer,
      actualMinutes: nullable(integer),
      actualTimeMissing: integer,
      plannedCost: money,
      plannedRevenue: money,
      plannedResult: signedMoney,
      actualCost: money,
      actualRevenue: money,
      actualResult: signedMoney,
      medical: object({
        visitors: medical,
        treatments: medical,
        transports: medical,
        emergencyPhysicians: medical,
      }),
    }),
    qualifications: array(
      object({
        qualification: ref("ServiceQualification"),
        plannedMinutes: integer,
        actualMinutes: nullable(integer),
        actualTimeMissing: integer,
      }),
    ),
    rows: array(ref("ServiceStatisticRow")),
  }),
  ServiceStatisticRow: object({
    ...coverage,
    id: string,
    title: string,
    status: ref("ServiceStatus"),
    startsAt: date,
    eventType: string,
    customer: string,
    supportOnly: boolean,
    requiredPersonnel: integer,
    assignedPersonnel: integer,
    plannedMinutes: integer,
    actualMinutes: nullable(integer),
    actualTimeMissing: integer,
    costs: ref("ServiceCosts"),
    outcome: ref("ServiceOutcome"),
    forecastComparable: boolean,
    forecasts: array(
      object({
        method: string,
        createdAt: date,
        metrics: { type: "object", additionalProperties: { type: "number" } },
      }),
    ),
  }),
};
