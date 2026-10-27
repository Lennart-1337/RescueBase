import { normalizeService } from "../src/services/service-planning/validation.js";
import { serviceCosts } from "../src/services/service-planning/costs.js";
import {
  attendanceMinutes,
  type ServiceRecord,
} from "../src/services/service-planning/record.js";
const assignment = {
  startsAt: new Date("2026-10-26T08:00:00Z"),
  endsAt: new Date("2026-10-26T10:30:00Z"),
  actualStartsAt: null,
  actualEndsAt: null,
  hourlyRate: "12.50",
};
const service = (extra = {}) =>
  ({
    assignments: [assignment],
    materialDiscounted: false,
    ...extra,
  }) as unknown as ServiceRecord;
describe("simple attendance pricing", () => {
  test("uses hourly prices plus exactly one material fee", () => {
    expect(serviceCosts(service()).planned.revenue).toBe("66.25");
    expect(
      serviceCosts(service({ materialDiscounted: true })).planned.revenue,
    ).toBe("31.25");
  });
  test("never substitutes planned attendance for missing actual attendance", () => {
    expect(serviceCosts(service()).actual).toMatchObject({
      complete: false,
      revenue: null,
      knownRevenue: "35.00",
    });
    expect(
      serviceCosts(
        service({
          assignments: [
            {
              ...assignment,
              actualStartsAt: assignment.startsAt,
              actualEndsAt: assignment.endsAt,
            },
          ],
        }),
      ).actual.revenue,
    ).toBe("66.25");
  });
  test("ignores obsolete pauses and old cost lines", () => {
    const row = service({
      assignments: [
        { ...assignment, breakMinutes: 90, actualBreakMinutes: 90 },
      ],
      lines: [{ plannedQuantity: "5", saleRate: "999" }],
      agreedRevenue: "9999",
    });
    expect(attendanceMinutes(row.assignments[0]!)).toBe(150);
    expect(serviceCosts(row).planned.revenue).toBe("66.25");
  });
  test("preserves completed legacy line totals", () => {
    const row = service({
      pricingModel: "LEGACY",
      agreedRevenue: null,
      lines: [
        {
          plannedQuantity: "8",
          actualQuantity: "8",
          costRate: "12.50",
          saleRate: "20",
        },
      ],
    });
    expect(serviceCosts(row).planned).toEqual({
      cost: "100.00",
      revenue: "160.00",
      result: "60.00",
    });
  });
  test("normalizes hourly prices and material discount without pause fields", () => {
    const row = normalizeService({
      title: "Dienst",
      customer: "Kunde",
      eventType: "Sport",
      location: "Köln",
      startsAt: assignment.startsAt.toISOString(),
      endsAt: assignment.endsAt.toISOString(),
      eventStartsAt: assignment.startsAt.toISOString(),
      eventEndsAt: assignment.endsAt.toISOString(),
      materialDiscounted: true,
      positions: [
        { id: "p", name: "Posten", qualification: "SANITARIAN", quantity: 1 },
      ],
      assignments: [
        {
          ...assignment,
          startsAt: assignment.startsAt.toISOString(),
          endsAt: assignment.endsAt.toISOString(),
          positionId: "p",
          personId: "h",
          qualification: "SANITARIAN",
          breakMinutes: 9999,
        },
      ],
    });
    expect(row.materialDiscounted).toBe(true);
    expect(row.assignments[0]).toMatchObject({ hourlyRate: "12.50" });
    expect(row.assignments[0]).not.toHaveProperty("breakMinutes");
  });
});
