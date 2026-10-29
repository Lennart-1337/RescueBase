import { calculateAttendanceAmount, calculateAttendancePricing } from "../src/services/attendance-pricing.js";

const assignment = {
  startsAt: "2026-10-24T08:00:00Z",
  endsAt: "2026-10-24T10:30:00Z",
  actualStartsAt: "2026-10-24T08:00:00Z",
  actualEndsAt: "2026-10-24T11:00:00Z",
  hourlyRate: "12.50",
};

describe("attendance pricing", () => {
  test("uses a custom material amount for planned and actual totals", () => {
    const result = calculateAttendancePricing([assignment], false, "47.25");
    expect(result.planned.revenue).toBe("84.75");
    expect(result.actual.revenue).toBe("84.75");
    expect(calculateAttendancePricing([assignment], true, "47.25").planned.revenue).toBe("37.50");
    expect(calculateAttendancePricing([assignment], false, "0").planned.revenue).toBe("37.50");
  });
  test.each(["-1", "", "NaN", "1.001"])("rejects invalid material amount even when discounted: %s", (rate) => {
    expect(() => calculateAttendancePricing([assignment], true, rate)).toThrow();
  });
  test("charges each person's hourly price and material once per service", () => {
    const result = calculateAttendancePricing([assignment, { ...assignment, hourlyRate: "20" }], false);
    expect(result.planned.revenue).toBe("132.50");
    expect(result.actual).toMatchObject({ complete: true, revenue: "132.50" });
  });

  test("waives the entire material flat rate when marked as discount", () => {
    expect(calculateAttendancePricing([assignment], true).planned.revenue).toBe("37.50");
    expect(calculateAttendancePricing([assignment], false).planned.revenue).toBe("72.50");
    expect(calculateAttendancePricing([assignment], true).actual.revenue).toBe("37.50");
  });

  test("rounds each started attendance hour up before calculating cents", () => {
    expect(calculateAttendanceAmount(assignment.startsAt, "2026-10-24T08:01:00Z", "20")).toBe("20.00");
    expect(calculateAttendanceAmount(assignment.startsAt, "2026-10-24T08:01:00Z", "0.30")).toBe("0.30");
    expect(calculateAttendancePricing([{ ...assignment, endsAt: "2026-10-24T08:01:00Z", hourlyRate: "20" }], true).planned.revenue).toBe("20.00");
  });

  test("uses elapsed time through the autumn timezone change and multiple days", () => {
    expect(calculateAttendanceAmount("2026-10-25T01:30:00+02:00", "2026-10-25T03:30:00+01:00", "10")).toBe("30.00");
    expect(calculateAttendanceAmount("2026-10-24T08:00:00Z", "2026-10-26T08:00:00Z", "10")).toBe("480.00");
  });

  test("keeps incomplete actual attendance distinct from zero", () => {
    const missing = { ...assignment, actualStartsAt: null, actualEndsAt: null };
    expect(calculateAttendancePricing([assignment, missing], false).actual).toMatchObject({ complete: false, revenue: null, knownRevenue: "72.50" });
    expect(calculateAttendancePricing([], false).actual).toMatchObject({ complete: false, revenue: null });
    expect(calculateAttendancePricing([assignment], true).actual.complete).toBe(true);
  });

  test("a zero hourly price is valid and never replaces missing actual attendance", () => {
    const free = { ...assignment, hourlyRate: "0" };
    expect(calculateAttendancePricing([free], true).actual).toMatchObject({ complete: true, revenue: "0.00" });
    expect(calculateAttendancePricing([free], false).planned.revenue).toBe("35.00");
  });

  test.each(["-1", "NaN", "1,50", "1.12345"])("rejects invalid price %s", (hourlyRate) => {
    expect(() => calculateAttendancePricing([{ ...assignment, hourlyRate }], false)).toThrow();
  });

  test("rejects incomplete, reversed, timezone-less and invalid timestamps", () => {
    expect(() => calculateAttendancePricing([{ ...assignment, actualEndsAt: null }], false)).toThrow();
    for (const endsAt of [assignment.startsAt, "2026-10-24T07:00:00Z", "2026-10-24T10:00:00", "2026-02-30T10:00:00Z"])
      expect(() => calculateAttendanceAmount(assignment.startsAt, endsAt, "10")).toThrow();
  });
});

test("keeps full hours exact and bills an extra minute as a full hour", () => {
  const start = "2026-10-24T08:00:00Z";
  expect(calculateAttendanceAmount(start, "2026-10-24T09:00:00Z", "10")).toBe("10.00");
  expect(calculateAttendanceAmount(start, "2026-10-24T09:01:00Z", "10")).toBe("20.00");
  expect(calculateAttendanceAmount(start, "2026-10-24T08:01:00Z", "0.1250")).toBe("0.13");
});
test("rounds separate morning and evening periods independently", () => {
  expect(calculateAttendancePricing([
    { ...assignment, endsAt: "2026-10-24T09:30:00Z", hourlyRate: "10" },
    { ...assignment, startsAt: "2026-10-24T16:00:00Z", endsAt: "2026-10-24T17:30:00Z", hourlyRate: "10" },
  ], true).planned.revenue).toBe("40.00");
});
