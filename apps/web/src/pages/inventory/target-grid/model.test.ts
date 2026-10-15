import { describe, expect, it } from "vitest";
import { parseQuantity, parseTabularPaste, buildChanges } from "./model";

describe("target grid values", () => {
  it("accepts blank as zero and whole quantities", () => {
    expect(parseQuantity("")).toBe(0);
    expect(parseQuantity(" 12 ")).toBe(12);
    expect(parseQuantity("2147483647")).toBe(2147483647);
  });
  it.each(["-1", "1.5", "1,5", "1e3", "Infinity", "2147483648", "abc"])("rejects invalid quantity %s", (value) => {
    expect(() => parseQuantity(value)).toThrow();
  });
  it("validates a whole single-column paste before accepting it", () => {
    expect(parseTabularPaste("2\r\n3\r\n", 2)).toEqual(["2", "3"]);
    expect(parseTabularPaste("2\n\n4", 3)).toEqual(["2", "", "4"]);
    expect(() => parseTabularPaste("2\n-3", 2)).toThrow();
    expect(() => parseTabularPaste("2\t3", 2)).toThrow();
    expect(() => parseTabularPaste("2\n3", 1)).toThrow();
  });
  it("sends only changed values and distinguishes a missing target from zero", () => {
    expect(buildChanges(["a", "b", "c"], { a: 5, b: 0 }, { a: "", b: "0", c: "" })).toEqual([
      { articleId: "a", targetQuantity: 0, expectedTargetQuantity: 5 },
    ]);
    expect(buildChanges(["c"], {}, { c: "3" })).toEqual([
      { articleId: "c", targetQuantity: 3, expectedTargetQuantity: null },
    ]);
  });
});
