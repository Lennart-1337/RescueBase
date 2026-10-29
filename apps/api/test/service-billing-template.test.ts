import { defaultBillingSettings } from "../src/settings/service-billing/defaults.js";
import {
  billingInput,
  billingModel,
} from "../src/services/service-planning/billing/model.js";
import type { ServiceRecord } from "../src/services/service-planning/record.js";
const start = new Date("2026-11-13T16:00:00Z"),
  end = new Date("2026-11-13T18:30:00Z");
const row = {
  title: "Schulfest",
  status: "PLANNING",
  pricingModel: "HOURLY",
  startsAt: start,
  positions: [{ id: "san", name: "DLRG Sanitäter/-in" }],
  assignments: Array.from({ length: 2 }, () => ({
    positionId: "san",
    startsAt: start,
    endsAt: end,
    hourlyRate: "14",
    actualStartsAt: start,
    actualEndsAt: end,
  })),
  materialRate: "35",
  materialDiscounted: false,
  additionalCharges: [],
  lines: [],
  agreedRevenue: null,
} as unknown as ServiceRecord;
const input = {
  kind: "OFFER",
  number: "007 SAN 2026",
  issuedOn: "2026-10-06",
  recipient:
    "Pestalozzi Schule Neukirchen-Vluyn\nWaldmannsweg 30\n47506 Neukirchen-Vluyn",
  salutation: "Sehr geehrte Frau Grittmann,",
  version: 0,
};
it("groups identical offer shifts into the original date/duration/count columns without changing started-hour billing", () => {
  const model = billingModel(row, billingInput(input));
  expect(model.lines).toHaveLength(2);
  expect(model.lines[0]).toMatchObject({
    date: "13.11.2026",
    duration: "2,5 h (17:00–19:30 Uhr)",
    count: "2",
    amount: "84.00",
    unitPrice: "14",
  });
  expect(model.total).toBe("119.00");
  expect(model.salutation).toBe(input.salutation);
});
it("keeps different rates and periods distinct and invoices separately billable", () => {
  const different = {
    ...row,
    assignments: [
      row.assignments[0]!,
      { ...row.assignments[1]!, hourlyRate: "12.50" },
    ],
  };
  expect(billingModel(different, billingInput(input)).lines).toHaveLength(3);
  expect(
    billingModel(row, billingInput({ ...input, kind: "INVOICE" })).lines,
  ).toHaveLength(3);
});
it("snapshots issuer details and derives validity from current central settings", () => {
  const settings = {
    ...defaultBillingSettings,
    street: "Neue Straße 12",
    offerValidityDays: 45,
    paymentTermDays: 21,
  };
  const model = billingModel(row, billingInput(input), settings);
  expect(model.settings).toEqual(settings);
  expect(model.validUntil).toBe("2026-11-20");
  settings.street = "Andere Straße 10";
  expect(model.settings?.street).toBe("Neue Straße 12");
});
it("validates salutations and validity overflow with configured days", () => {
  expect(() =>
    billingInput({ ...input, salutation: "a".repeat(151) }),
  ).toThrow();
  expect(() =>
    billingInput({ ...input, salutation: "Hallo\nInhalt" }),
  ).toThrow();
  expect(
    billingModel(row, billingInput({ ...input, salutation: undefined }))
      .salutation,
  ).toBe("Sehr geehrte Damen und Herren,");
  expect(() =>
    billingModel(row, billingInput({ ...input, issuedOn: "9999-12-01" }), {
      ...defaultBillingSettings,
      offerValidityDays: 365,
    }),
  ).toThrow();
});
