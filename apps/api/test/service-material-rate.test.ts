import { normalizeService } from "../src/services/service-planning/validation.js";
import { serviceCosts } from "../src/services/service-planning/costs.js";
import type { ServiceRecord } from "../src/services/service-planning/record.js";
const base = {
  title: "Dienst",
  customer: "Verein",
  eventType: "Sport",
  location: "Köln",
  startsAt: "2026-11-01T08:00:00Z",
  endsAt: "2026-11-01T10:00:00Z",
  eventStartsAt: "2026-11-01T08:00:00Z",
  eventEndsAt: "2026-11-01T10:00:00Z",
};
describe("editable material fee", () => {
  test("defaults to 35 EUR and preserves explicit zero", () => {
    expect(normalizeService(base).materialRate).toBe("35.00");
    expect(normalizeService({ ...base, materialRate: "0" }).materialRate).toBe(
      "0",
    );
  });
  test("uses a custom material fee exactly once and waives it with a discount", () => {
    const row = {
      assignments: [],
      materialRate: "42.75",
      materialDiscounted: false,
    } as unknown as ServiceRecord;
    expect(serviceCosts(row).planned.revenue).toBe("42.75");
    expect(
      serviceCosts({ ...row, materialDiscounted: true }).planned.revenue,
    ).toBe("0.00");
    expect(row.materialRate).toBe("42.75");
  });
  test.each(["-1", "1.234", "", null, "35,50", "NaN"])(
    "rejects invalid material rate %s even when discounted",
    (materialRate) => {
      expect(() =>
        normalizeService({ ...base, materialRate, materialDiscounted: true }),
      ).toThrow();
    },
  );
});
