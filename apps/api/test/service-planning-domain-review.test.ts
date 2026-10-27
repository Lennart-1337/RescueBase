import { timestamp } from "../src/services/service-planning/input.js";
import {
  evaluateWarnings,
  type WarningContext,
} from "../src/services/service-planning/warnings.js";
import {
  attendanceMinutes,
  type ServiceRecord,
} from "../src/services/service-planning/record.js";
const startsAt = new Date("2026-10-26T21:00:00Z"),
  endsAt = new Date("2026-10-26T23:00:00Z");
const assignment = {
  id: "a",
  personId: "one",
  positionId: "p",
  qualification: "SANITARIAN",
  startsAt,
  endsAt,
  hourlyRate: "0",
};
const service = {
  id: "service",
  status: "PLANNING",
  startsAt,
  endsAt,
  positions: [
    { id: "p", name: "Posten", quantity: 1, qualification: "SANITARIAN" },
  ],
  assignments: [assignment],
  reservations: [],
} as unknown as ServiceRecord;
const context = {
  people: [
    {
      id: "one",
      active: true,
      leader: false,
      qualifications: [
        {
          qualification: "SANITARIAN",
          validUntil: new Date("2026-10-26"),
          recognizedQualifications: [],
        },
      ],
    },
  ],
  kits: [],
  vehicles: [],
  devices: [],
  peers: [],
} as WarningContext;
describe("service scheduling domain regression review", () => {
  test.each([
    "2026-02-30T10:00:00Z",
    "2026-10-26T24:00:00Z",
    "2026-10-26T10:61:00Z",
  ])("rejects normalized impossible timestamp %s", (value) => {
    expect(() => timestamp(value)).toThrow();
  });
  test("qualification expiring today remains valid when the half-open shift ends at midnight", () => {
    expect(evaluateWarnings(service, context).map((w) => w.code)).not.toContain(
      "QUALIFICATION",
    );
  });
  test("qualification expiring today cannot cover one minute of tomorrow", () => {
    const row = {
      ...service,
      endsAt: new Date("2026-10-26T23:01:00Z"),
      assignments: [
        {
          ...service.assignments[0]!,
          endsAt: new Date("2026-10-26T23:01:00Z"),
        },
      ],
    };
    expect(evaluateWarnings(row, context).map((w) => w.code)).toContain(
      "QUALIFICATION",
    );
  });
  test("elapsed personnel minutes follow DST offsets", () => {
    const row = {
      ...service.assignments[0]!,
      startsAt: new Date("2026-10-25T01:00:00+02:00"),
      endsAt: new Date("2026-10-25T03:00:00+01:00"),
    };
    expect(attendanceMinutes(row)).toBe(180);
  });
  test("adjacent resource and personnel assignments do not conflict", () => {
    const peer = {
      ...service,
      id: "other",
      assignments: [
        {
          ...service.assignments[0]!,
          startsAt: endsAt,
          endsAt: new Date(endsAt.getTime() + 60000),
        },
      ],
    };
    expect(
      evaluateWarnings(service, { ...context, peers: [peer] }).map(
        (w) => w.code,
      ),
    ).not.toContain("PERSON_CONFLICT");
  });
});
