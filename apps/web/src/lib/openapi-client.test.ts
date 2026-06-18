import { describe, expect, it } from "vitest";
import { freshReportUrl } from "./openapi-client";

describe("freshReportUrl", () => {
  it("adds or replaces the rev parameter without dropping existing filters", () => {
    expect(freshReportUrl("/api/reports/procurement.pdf?q=Verband", "2026-06-18T12:56:00.000Z")).toBe(
      "/api/reports/procurement.pdf?q=Verband&rev=2026-06-18T12%3A56%3A00.000Z"
    );
    expect(freshReportUrl("/api/reports/procurement.pdf?q=Verband&rev=old", "2026-06-18T12:57:00.000Z")).toBe(
      "/api/reports/procurement.pdf?q=Verband&rev=2026-06-18T12%3A57%3A00.000Z"
    );
  });
});
