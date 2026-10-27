import { serviceStatistics } from "../src/services/service-planning/statistics.js";
import type { ServiceRecord } from "../src/services/service-planning/record.js";
const start = new Date("2026-10-26T08:00:00Z"),
  middle = new Date("2026-10-26T09:00:00Z"),
  end = new Date("2026-10-26T10:00:00Z");
const assignment = {
  id: "a",
  personId: "one",
  positionId: "p",
  qualification: "SANITARIAN",
  startsAt: start,
  endsAt: end,
  hourlyRate: "12.50",
  actualStartsAt: null,
  actualEndsAt: null,
};
const record = {
  id: "s",
  title: "Dienst",
  status: "PLANNING",
  startsAt: start,
  endsAt: end,
  positions: [{ id: "p", quantity: 1, qualification: "SANITARIAN" }],
  assignments: [assignment],
  lines: [],
  agreedRevenue: null,
  materialDiscounted: false,
  calculations: [],
  outcome: {},
  supportOnly: false,
} as unknown as ServiceRecord;
describe("time-weighted service staffing statistics", () => {
  test("consecutive helpers cover 100 percent rather than 200 percent", () => {
    const row = {
      ...record,
      assignments: [
        { ...assignment, endsAt: middle },
        { ...assignment, id: "b", personId: "two", startsAt: middle },
      ],
    } as ServiceRecord;
    expect(serviceStatistics([row]).totals).toMatchObject({
      occupancyRate: 1,
      requiredPersonnelMinutes: 120,
      coveredPersonnelMinutes: 120,
    });
  });
  test("half a shift is half covered, even when one person meets the headcount", () => {
    const row = {
      ...record,
      assignments: [{ ...assignment, endsAt: middle }],
    } as ServiceRecord;
    expect(serviceStatistics([row]).totals.occupancyRate).toBe(0.5);
  });
  test("excess attendance cannot inflate coverage above required positions", () => {
    const row = {
      ...record,
      assignments: [assignment, { ...assignment, id: "b", personId: "two" }],
    } as ServiceRecord;
    expect(serviceStatistics([row]).totals.occupancyRate).toBe(1);
    expect(serviceStatistics([row]).rows[0]?.coveredPersonnelMinutes).toBe(120);
  });
  test("a mismatched qualification and duplicate record cannot fill a second position", () => {
    const row = {
      ...record,
      positions: [{ ...record.positions[0]!, quantity: 2 }],
      assignments: [
        assignment,
        { ...assignment, id: "duplicate" },
        {
          ...assignment,
          id: "other",
          personId: "two",
          qualification: "PHYSICIAN",
        },
      ],
    } as ServiceRecord;
    expect(serviceStatistics([row]).totals.occupancyRate).toBe(0.5);
  });
  test("total occupancy weights services by required minutes", () => {
    const unfilled = {
      ...record,
      id: "empty",
      assignments: [],
      endsAt: middle,
    };
    expect(
      serviceStatistics([record, unfilled]).totals.occupancyRate,
    ).toBeCloseTo(120 / 180);
  });
  test("no positions means unknown occupancy, rather than a phantom zero", () => {
    expect(
      serviceStatistics([{ ...record, positions: [] }]).totals.occupancyRate,
    ).toBeNull();
  });
});
