import type { ServiceRecord } from "../src/services/service-planning/record.js";
import {
  billingModel,
  billingInput,
} from "../src/services/service-planning/billing/model.js";
const request = {
  kind: "OFFER",
  number: "012-SAN-2026",
  issuedOn: "2026-10-29",
  recipient: "Verein\nStraße 1\n47506 Neukirchen-Vluyn",
  version: 2,
};
const assignment = {
  startsAt: new Date("2026-10-25T08:00:00Z"),
  endsAt: new Date("2026-10-25T10:30:00Z"),
  actualStartsAt: new Date("2026-10-25T08:00:00Z"),
  actualEndsAt: new Date("2026-10-25T11:30:00Z"),
  hourlyRate: "14",
};
const service = (changes = {}) =>
  ({
    title: "Sanitätsdienst",
    pricingModel: "HOURLY",
    assignments: [assignment],
    lines: [],
    positions: [],
    materialRate: "35",
    materialDiscounted: false,
    additionalCharges: [],
    agreedRevenue: null,
    ...changes,
  }) as unknown as ServiceRecord;
describe("billing snapshot", () => {
  it("uses planned started hours, exact cents and 30 calendar days", () => {
    const model = billingModel(service(), billingInput(request));
    expect(model.validUntil).toBe("2026-11-28");
    expect(model.total).toBe("77.00");
    expect(model.lines[0]).toMatchObject({ quantity: "3 h", amount: "42.00" });
    expect(model.recipient).toContain("Straße 1");
  });
  it("uses actual hours for invoices and refuses missing actual attendance", () => {
    const input = billingInput({ ...request, kind: "INVOICE" });
    expect(billingModel(service(), input)).toMatchObject({
      total: "91.00",
      validUntil: null,
    });
    expect(() =>
      billingModel(
        service({ assignments: [{ ...assignment, actualEndsAt: null }] }),
        input,
      ),
    ).toThrow(/Ist/);
  });
  it("includes explicit material discount and additional charges once", () => {
    const model = billingModel(
      service({
        materialDiscounted: true,
        additionalCharges: [{ id: "1", label: "Fahrtkosten", amount: "12.50" }],
      }),
      billingInput(request),
    );
    expect(model.total).toBe("54.50");
    expect(model.lines.map((line) => line.amount)).toEqual([
      "42.00",
      "35.00",
      "-35.00",
      "12.50",
    ]);
  });
  it("preserves legacy quantities and agreed fixed totals with an explicit adjustment", () => {
    const model = billingModel(
      service({
        pricingModel: "LEGACY",
        agreedRevenue: "100",
        lines: [
          {
            label: "Personal",
            unit: "h",
            plannedQuantity: "3.5",
            actualQuantity: "4",
            saleRate: "14",
            costRate: "0",
          },
        ],
      }),
      billingInput(request),
    );
    expect(model.total).toBe("100.00");
    expect(model.lines.map((line) => line.amount)).toEqual(["49.00", "51.00"]);
  });
  it.each([
    { issuedOn: "2026-02-30" },
    { issuedOn: "" },
    { recipient: " " },
    { number: "../evil" },
    { kind: "OTHER" },
    { version: "2" },
  ])("rejects malformed input %j", (change) => {
    expect(() => billingInput({ ...request, ...change })).toThrow();
  });
  it("handles leap years and rejects overflowing validity dates", () => {
    expect(
      billingModel(
        service(),
        billingInput({ ...request, issuedOn: "2028-02-01" }),
      ).validUntil,
    ).toBe("2028-03-02");
    expect(() =>
      billingInput({ ...request, issuedOn: "9999-12-31" }),
    ).toThrow();
  });
  it("normalizes line endings and applies the recipient limit to standalone carriage returns", () => {
    expect(
      billingInput({ ...request, recipient: "Verein\rStraße 1\r\n47506 Ort" })
        .recipient,
    ).toBe("Verein\nStraße 1\n47506 Ort");
    expect(() =>
      billingInput({
        ...request,
        recipient: Array(9).fill("Adresse").join("\r"),
      }),
    ).toThrow(/8 Zeilen/);
    expect(() =>
      billingInput({ ...request, recipient: "a".repeat(501) }),
    ).toThrow();
  });
});
