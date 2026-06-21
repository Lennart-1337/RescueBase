import { isScheduleDue } from "../src/settings/settings-schedule.js";

describe("settings schedule", () => {
  it("uses the configured IANA timezone and local calendar day", () => {
    const now = new Date("2026-06-21T05:15:00.000Z");
    expect(isScheduleDue(now, null, "07:15", "Europe/Berlin")).toBe(true);
    expect(isScheduleDue(now, new Date("2026-06-20T23:30:00.000Z"), "07:15", "Europe/Berlin")).toBe(false);
    expect(isScheduleDue(now, new Date("2026-06-20T21:30:00.000Z"), "07:15", "Europe/Berlin")).toBe(true);
  });

  it("does not run before the configured local time", () => {
    expect(isScheduleDue(new Date("2026-06-21T05:14:00.000Z"), null, "07:15", "Europe/Berlin")).toBe(false);
  });
});
