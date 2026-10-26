import {
  normalizeService,
  normalizePerson,
} from "../src/services/service-planning/validation.js";
import { validateTransition } from "../src/services/service-planning/lifecycle.js";
import { serviceCosts } from "../src/services/service-planning/costs.js";
const base = {
  title: "Stadtlauf",
  customer: "Veranstalter",
  eventType: "SPORT",
  location: "Köln",
  eventStartsAt: "2026-10-26T10:00:00Z",
  eventEndsAt: "2026-10-26T16:00:00Z",
  startsAt: "2026-10-26T09:00:00Z",
  endsAt: "2026-10-26T17:00:00Z",
};
describe("service planning input and lifecycle", () => {
  it("keeps absent outcomes distinct from zero", () => {
    expect(normalizeService(base).outcome.treatments).toBeNull();
    expect(
      normalizeService({ ...base, outcome: { treatments: 0 } }).outcome
        .treatments,
    ).toBe(0);
  });
  it("rejects invalid/ambiguous ranges and unknown enums", () => {
    expect(() =>
      normalizeService({ ...base, endsAt: base.startsAt }),
    ).toThrow();
    expect(() =>
      normalizeService({ ...base, startsAt: "2026-10-26T09:00" }),
    ).toThrow();
    expect(() =>
      normalizePerson({
        name: "Helfer",
        qualifications: [{ qualification: "DOCTOR" }],
      }),
    ).toThrow();
  });
  it("rejects a duplicate person, dangling positions and pauses exceeding attendance", () => {
    const position = {
      id: "p",
      name: "Posten",
      qualification: "SANITARIAN",
      quantity: 1,
    };
    const person = {
      personId: "h",
      positionId: "p",
      qualification: "SANITARIAN",
      startsAt: base.startsAt,
      endsAt: base.endsAt,
    };
    expect(() =>
      normalizeService({
        ...base,
        positions: [position],
        assignments: [person, person],
      }),
    ).toThrow();
    expect(() =>
      normalizeService({ ...base, assignments: [person] }),
    ).toThrow();
    expect(() =>
      normalizeService({
        ...base,
        positions: [position],
        assignments: [{ ...person, breakMinutes: 9999 }],
      }),
    ).toThrow();
  });
  it("allows warned release only with justification and correction only with reason", () => {
    expect(() => validateTransition("PLANNING", "RELEASED", "", 1)).toThrow();
    expect(() =>
      validateTransition("PLANNING", "RELEASED", "Abgestimmte Ausnahme", 1),
    ).not.toThrow();
    expect(() => validateTransition("COMPLETED", "REVIEW", "", 0)).toThrow();
    expect(() =>
      validateTransition("COMPLETED", "REVIEW", "Nachtrag Stunden", 0),
    ).not.toThrow();
    expect(() => validateTransition("INQUIRY", "COMPLETED", "", 0)).toThrow();
  });
  it("rounds each money line exactly and does not turn unknown actuals into zero", () => {
    const costs = serviceCosts(
      [
        {
          plannedQuantity: "3",
          actualQuantity: null,
          costRate: "0.335",
          saleRate: "0.5",
        },
      ],
      null,
    );
    expect(costs.planned.cost).toBe("1.01");
    expect(costs.planned.revenue).toBe("1.50");
    expect(costs.actual.cost).toBeNull();
    expect(costs.actual.knownCost).toBe("0.00");
  });
});
