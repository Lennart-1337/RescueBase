import { deviceState, type DeviceRecord } from "../src/services/mpg-device-state.js";

describe("MPG device state", () => {
  it("requires a new device release after a model is reviewed again", () => {
    const device = {
      mpgModel: { requirementsReviewedAt: new Date("2026-09-20T00:00:00Z"), requirements: [] }, requirements: [], inspections: [],
      commissionedAt: new Date("2026-01-01T00:00:00Z"), incidents: [], glucoseControls: [], retiredAt: null,
      releasedAt: new Date("2026-09-01T00:00:00Z")
    } as unknown as DeviceRecord;
    expect(deviceState(device, new Date("2026-09-22T00:00:00Z")).status).toBe("DRAFT");
    expect(deviceState({ ...device, releasedAt: new Date("2026-09-21T00:00:00Z") }, new Date("2026-09-22T00:00:00Z")).status).toBe("RELEASED");
  });
  it("requires a new release after a stricter device requirement is documented", () => {
    const requirement = { id: "extra", kind: "OTHER", title: "Zusatzkontrolle", active: true, mandatory: true,
      intervalMonths: 12, firstDueAt: null, createdAt: new Date("2026-09-20T00:00:00Z") };
    const device = { mpgModel: { requirementsReviewedAt: new Date("2026-08-01T00:00:00Z"), requirements: [] }, requirements: [requirement], inspections: [],
      commissionedAt: new Date("2026-01-01T00:00:00Z"), incidents: [], glucoseControls: [], retiredAt: null,
      releasedAt: new Date("2026-09-01T00:00:00Z") } as unknown as DeviceRecord;
    expect(deviceState(device, new Date("2026-09-22T00:00:00Z")).status).toBe("DRAFT");
  });
  it.each([
    ["STK", "2028-09-30"], ["MTK", "2028-12-31"], ["MAINTENANCE", "2028-09-10"]
  ])("derives %s due date from a finalized inspection without an override", (kind, expected) => {
    const requirement = { id: "requirement", kind, active: true, mandatory: true, firstDueAt: null, intervalMonths: 24 };
    const device = {
      mpgModel: { requirementsReviewedAt: new Date(), requirements: [requirement] }, requirements: [],
      inspections: [{ id: "inspection", requirementId: "requirement", finalizedAt: new Date("2026-09-10T00:00:00Z"), performedAt: new Date("2026-09-10T00:00:00Z"), nextDueAt: null, correctionOfId: null }],
      commissionedAt: new Date("2026-01-01T00:00:00Z"), incidents: [], glucoseControls: [], retiredAt: null, releasedAt: new Date()
    } as unknown as DeviceRecord;
    expect(deviceState(device, new Date("2026-09-22T00:00:00Z")).requirements[0]?.dueDate).toBe(expected);
  });
  it("blocks an invalid legacy MTK interval without crashing the device list", () => {
    const requirement = { id: "mtk", kind: "MTK", title: "MTK", active: true, mandatory: true, firstDueAt: null, intervalMonths: 18 };
    const device = { mpgModel: { requirementsReviewedAt: new Date(), requirements: [requirement] }, requirements: [], inspections: [],
      commissionedAt: new Date("2026-01-01T00:00:00Z"), incidents: [], glucoseControls: [], retiredAt: null, releasedAt: new Date() } as unknown as DeviceRecord;
    expect(deviceState(device, new Date("2026-09-22T00:00:00Z")).reasons).toContain("Pflichtprüfung MTK: Fälligkeit fehlt.");
  });
  it("uses the statutory STK maximum after inspection when the original one-off due date has passed", () => {
    const requirement = { id: "stk", kind: "STK", active: true, mandatory: true, firstDueAt: new Date("2026-09-01T00:00:00Z"), intervalMonths: null };
    const device = {
      mpgModel: { requirementsReviewedAt: new Date(), requirements: [requirement] }, requirements: [],
      inspections: [{ id: "inspection", requirementId: "stk", finalizedAt: new Date(), performedAt: new Date("2026-09-10T00:00:00Z"), nextDueAt: null, correctionOfId: null }],
      commissionedAt: new Date("2026-01-01T00:00:00Z"), incidents: [], glucoseControls: [], retiredAt: null, releasedAt: new Date()
    } as unknown as DeviceRecord;
    expect(deviceState(device, new Date("2026-09-22T00:00:00Z")).requirements[0]?.dueDate).toBe("2028-09-30");
  });
  it("does not let a historical next due date extend a documented interval", () => {
    const requirement = { id: "stk", kind: "STK", active: true, mandatory: true, firstDueAt: null, intervalMonths: 12 };
    const device = {
      mpgModel: { requirementsReviewedAt: new Date(), requirements: [requirement] }, requirements: [],
      inspections: [{ id: "inspection", requirementId: "stk", finalizedAt: new Date(), performedAt: new Date("2026-09-10T00:00:00Z"),
        nextDueAt: new Date("2028-09-30T00:00:00Z"), correctionOfId: null }],
      commissionedAt: new Date("2026-01-01T00:00:00Z"), incidents: [], glucoseControls: [], retiredAt: null, releasedAt: new Date()
    } as unknown as DeviceRecord;
    expect(deviceState(device, new Date("2026-09-22T00:00:00Z")).requirements[0]?.dueDate).toBe("2027-09-30");
  });
});
