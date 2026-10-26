import {
  berlinInput,
  berlinIso,
  formatMinutes,
  money,
  rateMoney,
} from "./time";

describe("Berlin service times", () => {
  it("preserves cents when displaying exact large decimal amounts", () => {
    expect(money("99999999999998000000.01")).toContain(",01");
    expect(money(null)).toBe("Nicht erfasst");
  });
  it("retains sub-cent precision for unit rates", () => {
    expect(rateMoney("0.0040")).toContain("0,004");
  });
  it("uses Berlin independently of the browser timezone", () => {
    expect(berlinInput("2026-07-12T10:30:00.000Z")).toBe("2026-07-12T12:30");
    expect(berlinIso("2026-07-12T12:30")).toBe("2026-07-12T10:30:00.000Z");
    expect(berlinIso("2026-12-12T12:30")).toBe("2026-12-12T11:30:00.000Z");
  });
  it("rejects nonexistent hours and requires an explicit choice for both autumn hours", () => {
    expect(() => berlinIso("2026-03-29T02:30")).toThrow("existiert");
    expect(() => berlinIso("2026-10-25T02:30")).toThrow("zweimal");
    expect(berlinIso("2026-10-25T02:30", "EARLIER")).toBe(
      "2026-10-25T00:30:00.000Z",
    );
    expect(berlinIso("2026-10-25T02:30", "LATER")).toBe(
      "2026-10-25T01:30:00.000Z",
    );
  });
  it("keeps absent times distinct from zero hours", () => {
    expect(formatMinutes(null)).toBe("Nicht erfasst");
    expect(formatMinutes(0)).toBe("0:00 h");
    expect(formatMinutes(125)).toBe("2:05 h");
  });
});
