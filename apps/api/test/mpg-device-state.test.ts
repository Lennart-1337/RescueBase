import { deviceState, type DeviceRecord } from "../src/services/mpg-device-state.js";

describe("MPG device state", () => {
  it("does not reuse the original due date after a finalized inspection without a follow-up due date", () => {
    const requirement = { id: "stk", active: true, mandatory: true, firstDueAt: new Date("2026-09-01T00:00:00Z"), intervalMonths: null };
    const device = {
      mpgModel: { requirementsReviewedAt: new Date(), requirements: [requirement] }, requirements: [],
      inspections: [{ id: "inspection", requirementId: "stk", finalizedAt: new Date(), performedAt: new Date("2026-09-10T00:00:00Z"), nextDueAt: null, correctionOfId: null }],
      commissionedAt: new Date("2026-01-01T00:00:00Z"), incidents: [], glucoseControls: [], retiredAt: null, releasedAt: new Date()
    } as unknown as DeviceRecord;
    expect(deviceState(device, new Date("2026-09-22T00:00:00Z")).requirements[0]?.dueDate).toBeNull();
  });
});
