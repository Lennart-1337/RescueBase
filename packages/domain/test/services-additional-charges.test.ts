import { calculateAttendancePricing } from "../src/services/attendance-pricing.js";
const person = {
  startsAt: "2026-11-01T08:00:00Z",
  endsAt: "2026-11-01T10:00:00Z",
  actualStartsAt: "2026-11-01T08:00:00Z",
  actualEndsAt: "2026-11-01T11:00:00Z",
  hourlyRate: "12.50",
};
describe("additional service charges", () => {
  test("adds independent fixed amounts to personnel and material for plan and actual", () => {
    const costs = calculateAttendancePricing([person], false, "35", [{ amount: "12.75" }, { amount: "0.25" }]);
    expect(costs.planned.revenue).toBe("73.00");
    expect(costs.actual.revenue).toBe("85.50");
  });
  test("discounts material only and preserves additional charges", () => {
    expect(calculateAttendancePricing([person], true, "35", [{ amount: "12.75" }]).planned.revenue).toBe("37.75");
  });
  test("preserves exact cents, accepts zero, and does not mutate input", () => {
    const charges = Object.freeze([Object.freeze({ amount: "0.10" }), Object.freeze({ amount: "0.20" }), Object.freeze({ amount: "0" })]);
    expect(calculateAttendancePricing([], true, "35", [...charges]).planned.revenue).toBe("0.30");
  });
  test("keeps incomplete actual attendance distinct from known fixed charges", () => {
    const costs = calculateAttendancePricing([{ ...person, actualStartsAt: null, actualEndsAt: null }], false, "35", [{ amount: "12.75" }]);
    expect(costs.actual).toMatchObject({ complete: false, revenue: null, knownRevenue: "47.75" });
  });
  test.each(["-1", "NaN", "1.001", "", "1,50"])("rejects invalid charge %s even with material discounted", (amount) => {
    expect(() => calculateAttendancePricing([person], true, "35", [{ amount }])).toThrow();
  });
  test("removing all additional charges restores the base total", () => {
    expect(calculateAttendancePricing([person], false, "35", []).planned.revenue).toBe("60.00");
  });
});
