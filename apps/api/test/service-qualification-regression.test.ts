import { evaluateWarnings, type WarningContext } from "../src/services/service-planning/warnings.js";
import { normalizeService } from "../src/services/service-planning/validation.js";
import { serviceStatistics } from "../src/services/service-planning/statistics.js";
import type { ServiceRecord } from "../src/services/service-planning/record.js";
import { planningSnapshot } from "../src/services/service-planning/record.js";
const start = new Date("2026-11-01T08:00:00Z"), end = new Date("2026-11-01T10:00:00Z");
const position = { id: "p", name: "EVT 01", qualification: "PARAMEDIC", quantity: 1, leader: false };
const assignment = { id: "a", personId: "h", positionId: "p", qualification: "SANITARIAN", startsAt: start, endsAt: end, hourlyRate: "0", actualStartsAt: null, actualEndsAt: null };
const service = { id: "s", title: "Dienst", status: "PLANNING", startsAt: start, endsAt: end, positions: [position], assignments: [assignment], reservations: [], calculations: [], outcome: {}, materialDiscounted: false } as unknown as ServiceRecord;
const context = { people: [{ id: "h", active: true, leader: false, qualifications: [] }], vehicles: [], kits: [], devices: [], peers: [] } as WarningContext;
const warnings = (qualifications: WarningContext["people"][number]["qualifications"]) => evaluateWarnings(service, { ...context, people: [{ ...context.people[0]!, qualifications }] }).filter((w) => w.code === "QUALIFICATION");
describe("canonical service position qualification", () => {
  test("removes the warning once the current person record proves the required qualification", () => {
    expect(warnings([])).toHaveLength(1);
    expect(warnings([{ qualification: "PARAMEDIC", validUntil: null, recognizedQualifications: [] }])).toEqual([]);
  });
  test("keeps missing, expired and unknown-equivalence warnings accurate", () => {
    expect(warnings([])[0]?.message).toContain("Rettungssanitäter");
    const expired = [{ qualification: "PARAMEDIC", validUntil: new Date("2026-10-31"), recognizedQualifications: [] }];
    expect(warnings(expired)[0]?.message).toContain("gültig");
    expect(warnings([{ qualification: "PHYSICIAN", validUntil: null, recognizedQualifications: [] }])).toHaveLength(1);
    expect(warnings([{ qualification: "PHYSICIAN", validUntil: null, recognizedQualifications: ["PARAMEDIC"] }])).toEqual([]);
  });
  test("derives the planned role from its position when saving, including omitted copies", () => {
    const body = { title: "Dienst", customer: "Verein", eventType: "Sport", location: "Köln", startsAt: start.toISOString(), endsAt: end.toISOString(), eventStartsAt: start.toISOString(), eventEndsAt: end.toISOString(), positions: [position], assignments: [{ ...assignment, startsAt: start.toISOString(), endsAt: end.toISOString() }] };
    expect(normalizeService(body).assignments[0]?.qualification).toBe("PARAMEDIC");
    expect(normalizeService({ ...body, assignments: [{ ...body.assignments[0], qualification: undefined }] }).assignments[0]?.qualification).toBe("PARAMEDIC");
    expect(() => normalizeService({ ...body, assignments: [{ ...body.assignments[0], qualification: "DOCTOR" }] })).toThrow();
  });
  test("attributes legacy copied roles to their current positions without mutating stored records", () => {
    const result = serviceStatistics([service]);
    expect(result.totals.occupancyRate).toBe(1);
    expect(result.qualifications).toMatchObject([{ qualification: "PARAMEDIC", plannedMinutes: 120 }]);
    expect(service.assignments[0]?.qualification).toBe("SANITARIAN");
  });
  test("copy correction alone does not invalidate approval, but changing the position requirement does", () => {
    expect(planningSnapshot(service)).toEqual(planningSnapshot({
      ...service, assignments: [{ ...service.assignments[0]!, qualification: "PARAMEDIC" }],
    }));
    expect(planningSnapshot(service)).not.toEqual(planningSnapshot({
      ...service, positions: [{ ...service.positions[0]!, qualification: "PHYSICIAN" }],
    }));
  });
});
