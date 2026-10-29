import { normalizeService } from "../src/services/service-planning/validation.js";
import { personnelWarnings } from "../src/services/service-planning/personnel-warnings.js";
import { serviceStatistics } from "../src/services/service-planning/statistics.js";
import type { ServiceRecord } from "../src/services/service-planning/record.js";
import type { WarningContext } from "../src/services/service-planning/warning-context.js";
const start = "2026-11-01T08:00:00Z", middle = "2026-11-01T10:00:00Z", end = "2026-11-01T18:00:00Z";
const position = { id: "p", name: "Posten", qualification: "SANITARIAN", quantity: 1 };
const first = { id: "morning", personId: "person", positionId: "p", startsAt: start, endsAt: middle, hourlyRate: "10.00" };
const second = { ...first, id: "evening", startsAt: "2026-11-01T16:00:00Z", endsAt: end };
const body = { title: "Zwei Zeiten", customer: "Verein", eventType: "Sport", location: "Köln",
  startsAt: start, endsAt: end, eventStartsAt: start, eventEndsAt: end, positions: [position], assignments: [first, second] };
const context = { people: [{ id: "person", active: true, leader: false, qualifications: [{ qualification: "SANITARIAN", validUntil: null, recognizedQualifications: [] }] }], peers: [] } as unknown as WarningContext;
function record(assignments = [first, second]): ServiceRecord {
  return { ...normalizeService({ ...body, assignments }), id: "service", status: "COMPLETED", calculations: [],
    startsAt: new Date(start), endsAt: new Date(end),
    assignments: assignments.map((a) => ({ ...a, qualification: "SANITARIAN", startsAt: new Date(a.startsAt), endsAt: new Date(a.endsAt), actualStartsAt: null, actualEndsAt: null })),
  } as unknown as ServiceRecord;
}
describe("repeat attendance for one person", () => {
  it("accepts separate periods while preserving assignment identity", () => {
    expect(normalizeService(body).assignments.map((a) => a.id)).toEqual(["morning", "evening"]);
  });
  it("counts distinct people while summing both intervals in hours and prices", () => {
    const result = serviceStatistics([record()]);
    expect(result.totals).toMatchObject({ assignedPersonnel: 1, plannedMinutes: 240, actualMinutes: 240, actualRevenue: "75.00" });
    expect(result.qualifications[0]).toMatchObject({ plannedMinutes: 240, actualMinutes: 240 });
  });
  it("warns on overlapping attendance without counting one person as two positions", () => {
    const row = record([first, { ...second, startsAt: first.startsAt, endsAt: first.endsAt }]);
    row.positions[0]!.quantity = 2;
    const warnings = personnelWarnings(row, context);
    expect(warnings.filter((w) => w.code === "PERSON_CONFLICT")).toHaveLength(2);
    expect(warnings.some((w) => w.code === "UNDERSTAFFED")).toBe(true);
  });
  it("warns when separate planned periods overlap in recorded actual times", () => {
    const row = record();
    for (const a of row.assignments) {
      a.actualStartsAt = new Date(start); a.actualEndsAt = new Date(middle);
    }
    expect(personnelWarnings(row, context).filter((w) => w.code === "PERSON_CONFLICT")).toHaveLength(2);
  });
  it("checks qualification expiry separately at each attendance period", () => {
    const row = record();
    row.endsAt = new Date("2026-11-02T18:00:00Z");
    row.assignments[1]!.startsAt = new Date("2026-11-02T16:00:00Z");
    row.assignments[1]!.endsAt = row.endsAt;
    const expiry = { ...context, people: [{ ...context.people[0]!, qualifications: [{ ...context.people[0]!.qualifications[0]!, validUntil: "2026-11-01" }] }] };
    expect(personnelWarnings(row, expiry).filter((w) => w.code === "QUALIFICATION").map((w) => w.entityId)).toEqual(["evening"]);
  });
  it("allows touching boundaries without a conflict and checks each period's qualification", () => {
    const row = record([first, { ...second, startsAt: middle }]);
    expect(personnelWarnings(row, context).some((w) => w.code === "PERSON_CONFLICT")).toBe(false);
    const expired = { ...context, people: [{ ...context.people[0]!, qualifications: [{ ...context.people[0]!.qualifications[0]!, validUntil: "2026-10-31" }] }] };
    expect(personnelWarnings(row, expired).filter((w) => w.code === "QUALIFICATION")).toHaveLength(2);
  });
});
