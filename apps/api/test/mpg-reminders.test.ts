import { buildMpgReminders } from "../src/mpg-notifications/reminders.js";

const device = {
  id: "device-1",
  name: "AED 1",
  locationId: "location-1",
  status: "RELEASED",
  reasons: [] as string[],
  requirements: [{ id: "requirement-1", dueDate: "2026-10-01" }],
};

describe("MPG reminders", () => {
  it("emits reminders exactly 30 and 7 calendar days before the deadline", () => {
    const thirtyDays = buildMpgReminders(device, "2026-09-01");
    const sevenDays = buildMpgReminders(device, "2026-09-24");

    expect(thirtyDays).toHaveLength(1);
    expect(sevenDays).toHaveLength(1);
    expect(buildMpgReminders(device, "2026-09-25")).toHaveLength(0);
    expect(thirtyDays[0]?.key).not.toBe(sevenDays[0]?.key);
  });

  it("uses the same block key regardless of reason ordering", () => {
    const blocked = { ...device, status: "BLOCKED", reasons: ["Defekt", "Prüfung überfällig"] };
    const first = buildMpgReminders(blocked, "2026-09-25");
    const reordered = buildMpgReminders({ ...blocked, reasons: [...blocked.reasons].reverse() }, "2026-09-26");

    expect(first[0]?.key).toBe(reordered[0]?.key);
  });

  it("does not notify for retired devices", () => {
    expect(buildMpgReminders({ ...device, status: "RETIRED" }, "2026-09-01")).toEqual([]);
  });
});
