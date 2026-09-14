import { date, integer, isFutureCalendarDate, revision, text } from "../../src/mpg/mpg.validation.js";
describe("MPG input invariants", () => {
  it("rejects missing evidence and malformed dates", () => {
    expect(() => text("  ", "Quelle")).toThrow();
    expect(() => date("invalid")).toThrow();
    expect(() => integer(1.5)).toThrow();
  });
  it("rejects stale changes rather than overwriting evidence", () => {
    expect(() => revision(2, 1)).toThrow();
    expect(() => revision(2, 2)).not.toThrow();
  });
  it("accepts today's local date shortly before UTC midnight", () => {
    const lateEveningUtc = new Date("2026-09-14T22:30:00.000Z");
    expect(isFutureCalendarDate(date("2026-09-15"), lateEveningUtc)).toBe(false);
    expect(isFutureCalendarDate(date("2026-09-16"), lateEveningUtc)).toBe(true);
  });
});
