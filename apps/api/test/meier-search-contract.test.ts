import "reflect-metadata";
import { readFileSync } from "node:fs";
import { REQUIRED_ROLES, RATE_LIMIT } from "../src/auth/auth.decorators.js";
import { CatalogMeierSearchController } from "../src/modules/catalog/meier-search.controller.js";
import { parseMeierSearch } from "../src/modules/catalog/meier-search/parser.js";
import { rescueBaseOpenApiDocument } from "../src/openapi/document.js";
describe("Meier search API and real shop markup", () => {
  it("restricts read-only search to administrators and limits supplier requests", () => {
    expect(
      Reflect.getMetadata(REQUIRED_ROLES, CatalogMeierSearchController),
    ).toEqual(["ADMIN"]);
    expect(
      Reflect.getMetadata(
        RATE_LIMIT,
        CatalogMeierSearchController.prototype.search,
      ),
    ).toEqual({ limit: 20, windowMs: 60_000 });
    expect(
      rescueBaseOpenApiDocument.paths["/catalog/articles/meier-search"]?.post
        ?.operationId,
    ).toBe("CatalogMeierSearchController_search");
  });
  it("decodes the shop's double-escaped manufacturer Unicode", () => {
    const fixture = readFileSync(
      new URL("./fixtures/meier-search/ambu.html", import.meta.url),
      "utf8",
    ).replace(/Ambu GmbH/gu, "MEIERmed\\\\u00ae");
    expect(parseMeierSearch(fixture, "ambu", 1).items[0].manufacturer).toBe(
      "MEIERmed®",
    );
  });
  it("parses compact real search cards without recommendations or inferred prices", () => {
    const result = parseMeierSearch(
      readFileSync(
        new URL("./fixtures/meier-search/ambu.html", import.meta.url),
      ),
      "ambu",
      1,
    );
    expect(result.items).toHaveLength(3);
    expect(result.totalPages).toBeGreaterThan(1);
    expect(result.items[0].name).toContain("Ambu®");
    expect(result.items[0].supplierArticleNumber).toBeTruthy();
    expect(result.items[0].url).toMatch(
      /^https:\/\/www\.meier-medizintechnik\.de\//,
    );
    expect(result.warnings).toEqual([]);
  });
});
