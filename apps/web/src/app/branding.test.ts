import { getBrandMark } from "./branding";

describe("getBrandMark", () => {
  it("uses the initials of the first two words", () => {
    expect(getBrandMark("RescueBase Pro")).toBe("RP");
  });

  it("uses the first two letters for single-word names", () => {
    expect(getBrandMark("Medicore")).toBe("ME");
  });

  it("falls back when the name is empty", () => {
    expect(getBrandMark("   ")).toBe("RB");
  });
});
