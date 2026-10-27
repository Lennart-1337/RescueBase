import { normalizeService } from "../src/services/service-planning/validation.js";
import { serviceCosts } from "../src/services/service-planning/costs.js";
import type { ServiceRecord } from "../src/services/service-planning/record.js";
const base = {
  title: "Dienst", customer: "Verein", eventType: "Sport", location: "Köln",
  startsAt: "2026-11-01T08:00:00Z", endsAt: "2026-11-01T10:00:00Z",
  eventStartsAt: "2026-11-01T08:00:00Z", eventEndsAt: "2026-11-01T10:00:00Z",
};
const charge = { id: "travel", label: "Fahrtkosten", amount: "19.95" };
describe("additional service charges", () => {
  test("defaults to no charges and preserves named amounts including zero", () => {
    expect(normalizeService(base).additionalCharges).toEqual([]);
    expect(normalizeService({ ...base, additionalCharges: [charge] }).additionalCharges).toEqual([charge]);
    expect(normalizeService({ ...base, additionalCharges: [{ ...charge, amount: "0" }] }).additionalCharges[0]?.amount).toBe("0");
  });
  test.each([
    [{ ...charge, label: " " }], [{ ...charge, label: "x".repeat(192) }],
    [{ ...charge, amount: "-1" }], [{ ...charge, amount: "1.001" }],
    [{ ...charge, amount: "" }], [charge, charge], "invalid", {}, null,
  ].map((value) => [value]))("rejects invalid charges %j", (additionalCharges) => {
    expect(() => normalizeService({ ...base, additionalCharges })).toThrow();
  });
  test("adds charges once and keeps them when only material is discounted", () => {
    const row = { assignments: [], materialRate: "35", materialDiscounted: false,
      additionalCharges: [charge, { id: "parking", label: "Parken", amount: "2.50" }],
    } as unknown as ServiceRecord;
    expect(serviceCosts(row).planned.revenue).toBe("57.45");
    const discounted = serviceCosts({ ...row, materialDiscounted: true });
    expect(discounted.planned.revenue).toBe("22.45");
    expect(discounted.actual).toMatchObject({ revenue: null, knownRevenue: "22.45" });
  });
});
