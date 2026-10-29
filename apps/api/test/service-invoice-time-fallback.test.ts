import {
  billingInput,
  billingModel,
} from "../src/services/service-planning/billing/model.js";
import type { ServiceRecord } from "../src/services/service-planning/record.js";
const planned = {
  startsAt: new Date("2026-10-25T09:00:00Z"),
  endsAt: new Date("2026-10-25T11:30:00Z"),
  hourlyRate: "14",
  actualStartsAt: null,
  actualEndsAt: null,
};
const row = (assignments: unknown[]) =>
  ({
    title: "Dienst",
    status: "COMPLETED",
    pricingModel: "HOURLY",
    assignments,
    positions: [],
    lines: [],
    materialRate: "35",
    materialDiscounted: false,
    additionalCharges: [],
    agreedRevenue: null,
  }) as unknown as ServiceRecord;
const input = billingInput({
  kind: "INVOICE",
  number: "012-SAN-2026",
  issuedOn: "2026-10-29",
  recipient: "Testverein",
  version: 0,
});
it("invoices planned started hours if no actual times have been entered", () => {
  const model = billingModel(row([planned]), input);
  expect(model.total).toBe("77.00");
  expect(model.lines[0]).toMatchObject({
    quantity: "3 h",
    amount: "42.00",
    timeBasis: "PLANNED",
  });
  expect(model.lines[0]?.description).toContain("Plan-Zeiten");
});
it("prefers actual intervals for recorded shifts and falls back independently for other shifts", () => {
  const model = billingModel(
    row([
      planned,
      {
        ...planned,
        actualStartsAt: planned.startsAt,
        actualEndsAt: new Date("2026-10-25T12:30:00Z"),
      },
    ]),
    input,
  );
  expect(model.total).toBe("133.00");
  expect(model.lines.slice(0, 2).map((line) => line.timeBasis)).toEqual([
    "PLANNED",
    "ACTUAL",
  ]);
  expect(model.lines[1]?.quantity).toBe("4 h");
});
it("rejects incomplete actual pairs instead of combining planned and actual boundaries", () => {
  expect(() =>
    billingModel(
      row([{ ...planned, actualStartsAt: planned.startsAt }]),
      input,
    ),
  ).toThrow(/vollständig/);
});
it("falls back to planned legacy quantities while preserving explicit actual zero", () => {
  const service = {
    ...row([]),
    pricingModel: "LEGACY",
    lines: [
      {
        label: "Personal",
        unit: "h",
        plannedQuantity: "3",
        actualQuantity: null,
        saleRate: "14",
        costRate: "0",
      },
      {
        label: "Weiteres Personal",
        unit: "h",
        plannedQuantity: "5",
        actualQuantity: "0",
        saleRate: "14",
        costRate: "0",
      },
    ],
  } as unknown as ServiceRecord;
  const model = billingModel(service, input);
  expect(model.total).toBe("42.00");
  expect(model.lines.map((line) => line.amount)).toEqual(["42.00", "0.00"]);
});
