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

  it("round-trips optional short names without adding them to older article exports", () => {
    const articles = [{ id: "legacy", name: "Verbandpäckchen mittel" }, { id: "new", name: "Kompresse steril 10 × 10 cm", shortName: "Kompresse 10 × 10" }];
    const exported = JSON.stringify({ format: "rescuebase-master-data", version: 1, exportedAt: "2026-10-15T12:00:00Z", data: { articles } });
    const bundle = parseMasterDataBundle(JSON.parse(exported));
    expect(bundle.data.articles).toEqual(articles);
    expect(bundle.data.articles?.[0]).not.toHaveProperty("shortName");
    expect(bundle.data.articles?.[1]).toHaveProperty("shortName", "Kompresse 10 × 10");
  });

  it("imports dependencies before their references", () => {
    expect(importSectionOrder).toEqual(["suppliers", "locations", "articles", "templates"]);
  });
});
