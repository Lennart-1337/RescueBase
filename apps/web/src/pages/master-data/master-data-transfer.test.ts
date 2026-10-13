import { describe, expect, it } from "vitest";
import { bundleCounts, importSectionOrder, parseMasterDataBundle } from "./master-data-transfer";

describe("master-data transfer", () => {
  it("accepts a versioned export and reports its selected sections", () => {
    const bundle = parseMasterDataBundle({ format: "rescuebase-master-data", version: 1, exportedAt: "2026-07-22T12:00:00.000Z", data: { articles: [{ id: "article-1" }], locations: [] } });
    expect(bundleCounts(bundle)).toContainEqual({ section: "articles", count: 1 });
    expect(bundleCounts(bundle)).toContainEqual({ section: "locations", count: 0 });
  });

  it("ignores removed device sections in older exports", () => {
    const bundle = parseMasterDataBundle({ format: "rescuebase-master-data", version: 1, exportedAt: "2026-07-22T12:00:00.000Z", data: { articles: [{ id: "article-1" }], devices: [{ id: "device-1" }] } });
    expect(bundleCounts(bundle).map(({ section }) => section)).not.toContain("devices");
    expect(bundleCounts(bundle)).toContainEqual({ section: "articles", count: 1 });
  });

  it("rejects unknown file formats", () => {
    expect(() => parseMasterDataBundle({ format: "other", version: 1, data: {} })).toThrow("kein gültiger");
  });

  it("imports dependencies before their references", () => {
    expect(importSectionOrder).toEqual(["suppliers", "locations", "articles", "templates"]);
  });
});
