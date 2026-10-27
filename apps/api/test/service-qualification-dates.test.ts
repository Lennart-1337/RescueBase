import { calendarDate, timestamp } from "../src/services/service-planning/input.js";
import { date } from "../src/services/mpg-validation.js";
import { qualificationWarning } from "../src/services/service-planning/qualification.js";
const end = new Date("2026-11-01T10:00:00Z");
const proof = (validUntil: string | null) => [{ qualification: "PARAMEDIC", validUntil, recognizedQualifications: [] }];
describe("database-safe qualification dates", () => {
  test.each(["0000-01-01", "0026-11-01", "0999-12-31"])("rejects unsupported new calendar year %s", (value) => {
    expect(() => calendarDate(value)).toThrow();
    expect(() => timestamp(`${value}T10:00:00Z`)).toThrow();
    expect(() => date(value)).toThrow();
  });
  test("preserves valid boundary dates and existing ISO timestamp input", () => {
    expect(calendarDate("1000-01-01")).toBe("1000-01-01");
    expect(calendarDate("9999-12-31")).toBe("9999-12-31");
    expect(date("2026-10-27T12:00:00.000Z").toISOString()).toBe("2026-10-27T12:00:00.000Z");
    expect(calendarDate(null)).toBeNull();
    expect(timestamp("1000-01-01T00:00:00Z")).toBe("1000-01-01T00:00:00.000Z");
    expect(timestamp("9999-12-31T23:59:00Z")).toBe("9999-12-31T23:59:00.000Z");
  });
  test.each(["1000-01-01T00:00:00+14:00", "9999-12-31T23:59:00-12:00"])("rejects UTC overflow across SQL year bounds: %s", (value) => {
    expect(() => timestamp(value)).toThrow();
    expect(() => date(value)).toThrow();
  });
  test.each(["0000-00-00", "2026-00-01", "2026-02-30"])("invalid stored expiry %s never certifies a person", (value) => {
    expect(qualificationWarning(proof(value), "PARAMEDIC", end)).toContain("ungültig");
  });
  test("treats a stored low year as expired without correcting it into the future", () => {
    expect(qualificationWarning(proof("0026-11-01"), "PARAMEDIC", end)).toContain("gültig");
    expect(qualificationWarning(proof(null), "PARAMEDIC", end)).toBeNull();
    expect(qualificationWarning(proof("2026-11-01"), "PARAMEDIC", end)).toBeNull();
  });
});
