import {
  evaluateWarnings,
  type WarningContext,
} from "../src/services/service-planning/warnings.js";
import type { ServiceRecord } from "../src/services/service-planning/record.js";
const start = new Date("2026-10-26T09:00:00Z"),
  end = new Date("2026-10-26T12:00:00Z");
const service = {
  id: "s1",
  status: "PLANNING",
  startsAt: start,
  endsAt: end,
  positions: [
    {
      id: "p",
      name: "Posten",
      qualification: "SANITARIAN",
      leader: false,
      quantity: 1,
    },
  ],
  assignments: [
    {
      id: "a",
      personId: "h",
      positionId: "p",
      qualification: "SANITARIAN",
      startsAt: start,
      endsAt: end,
      breakMinutes: 0,
    },
  ],
  reservations: [
    { id: "r", kind: "KIT", resourceId: "kit", startsAt: start, endsAt: end },
  ],
  tasks: [],
} as unknown as ServiceRecord;
const context = {
  people: [
    {
      id: "h",
      active: true,
      leader: false,
      qualifications: [
        {
          qualification: "SANITARIAN",
          validUntil: null,
          recognizedQualifications: [],
        },
      ],
    },
  ],
  kits: [{ id: "kit", status: "READY" }],
  vehicles: [],
  devices: [{ id: "device", kitId: "kit", status: "RELEASED" }],
  peers: [],
} as unknown as WarningContext;
describe("service planning warnings", () => {
  it("finds a conflict between a kit and its contained device", () => {
    const peer = {
      ...service,
      id: "s2",
      reservations: [
        { ...service.reservations[0], kind: "DEVICE", resourceId: "device" },
      ],
    } as ServiceRecord;
    expect(
      evaluateWarnings(service, { ...context, peers: [peer] }).map(
        (w) => w.code,
      ),
    ).toContain("RESOURCE_CONFLICT");
  });
  it("does not reserve resources for an inquiry or cancelled event", () => {
    const peer = { ...service, id: "s2", status: "INQUIRY" };
    expect(
      evaluateWarnings(service, { ...context, peers: [peer] }).map(
        (w) => w.code,
      ),
    ).not.toContain("RESOURCE_CONFLICT");
  });
  it("does not treat a higher qualification as automatically equivalent", () => {
    const people = [
      {
        ...context.people[0],
        qualifications: [
          {
            qualification: "EMERGENCY_PARAMEDIC",
            validUntil: null,
            recognizedQualifications: [],
          },
        ],
      },
    ];
    expect(
      evaluateWarnings(service, { ...context, people }).map((w) => w.code),
    ).toContain("QUALIFICATION");
    people[0]!.qualifications[0]!.recognizedQualifications = ["SANITARIAN"];
    expect(
      evaluateWarnings(service, { ...context, people }).map((w) => w.code),
    ).not.toContain("QUALIFICATION");
  });
  it("checks temporal coverage, not only number of names", () => {
    const short = {
      ...service,
      assignments: [
        {
          ...service.assignments[0]!,
          startsAt: new Date("2026-10-26T10:00:00Z"),
        },
      ],
    };
    expect(evaluateWarnings(short, context).map((w) => w.code)).toContain(
      "UNDERSTAFFED",
    );
  });
});
