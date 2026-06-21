import { defaultTimezone } from "../src/settings/default-timezone.js";

describe("default timezone", () => {
  it("prefers TZ, then the runtime timezone, then UTC", () => {
    expect(defaultTimezone("Europe/Berlin", "America/New_York")).toBe("Europe/Berlin");
    expect(defaultTimezone("invalid", "America/New_York")).toBe("America/New_York");
    expect(defaultTimezone("invalid", "also-invalid")).toBe("UTC");
  });
});
