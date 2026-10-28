import { serviceStatistics, statisticsCsv } from "../src/services/service-planning/statistics.js";
import type { ServiceRecord } from "../src/services/service-planning/record.js";
const start = new Date("2026-10-25T00:00:00Z"), end = new Date("2026-10-25T03:00:00Z");
const assignment = { id: "a", personId: "one", positionId: "p", qualification: "SANITARIAN",
  startsAt: start, endsAt: end, hourlyRate: "10.00", actualStartsAt: null, actualEndsAt: null };
const record = { id: "s", title: "Dienst", status: "COMPLETED", startsAt: start, endsAt: end,
  positions: [{ id: "p", quantity: 2, qualification: "SANITARIAN" }], assignments: [assignment],
  lines: [], agreedRevenue: null, materialDiscounted: false, materialRate: "35.00",
  calculations: [], outcome: {}, supportOnly: false } as unknown as ServiceRecord;
describe("completed service attendance statistics", () => {
  test("uses planned attendance for completed services without changing stored records", () => {
    const result = serviceStatistics([record]);
    expect(result.totals).toMatchObject({ actualMinutes: 180, actualTimeMissing: 0, actualRevenue: "65.00" });
    expect(result.rows[0]).toMatchObject({ actualMinutes: 180, actualTimeMissing: 0 });
    expect(result.qualifications[0]).toMatchObject({ actualMinutes: 180, actualTimeMissing: 0 });
    expect(result.rows[0]!.outcome.visitors).toBeNull();
    expect(record.assignments[0]!.actualStartsAt).toBeNull();
    expect(statisticsCsv(result).split("\r\n")[1]!.split(";").slice(5, 7)).toEqual(['"3"', '"3"']);
  });
  test("prefers recorded actual times and fills only assignments with neither actual endpoint", () => {
    const result = serviceStatistics([{ ...record, assignments: [
      assignment, { ...assignment, id: "b", personId: "two", actualStartsAt: start,
        actualEndsAt: new Date("2026-10-25T01:00:00Z") },
    ] } as ServiceRecord]);
    expect(result.totals).toMatchObject({ plannedMinutes: 360, actualMinutes: 240, actualRevenue: "75.00" });
    expect(result.qualifications[0]!.actualMinutes).toBe(240);
  });
  test.each(["PLANNING", "RELEASED", "ACTIVE", "REVIEW", "CANCELLED"])("keeps absent actual attendance unknown for %s", (status) => {
    expect(serviceStatistics([{ ...record, status } as ServiceRecord]).totals).toMatchObject({ actualMinutes: null, actualTimeMissing: 1 });
  });
  test("never overwrites a partial actual interval with planned attendance", () => {
    expect(() => serviceStatistics([{ ...record, assignments: [{ ...assignment, actualStartsAt: start }] } as ServiceRecord]))
      .toThrow("Actual attendance must be complete.");
  });
});
