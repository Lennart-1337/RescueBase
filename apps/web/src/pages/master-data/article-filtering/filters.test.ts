import { describe, expect, it } from "vitest";
import { article as fixtureArticle } from "../../../test-support/fixtures";
import { matchesArticleFilters } from "./matches";
import { parseArticleFilters, serializeArticleFilters } from "./search";
import type { Article } from "../../../lib/types";
import type { ArticleFilters } from "../types";
const article = { ...fixtureArticle, stkIntervalMonths: undefined, mtkIntervalMonths: undefined };
const defaults = () => parseArticleFilters({});
const matches = (patch: Partial<ArticleFilters>, entry: Article = article) => matchesArticleFilters(entry, { ...defaults(), ...patch });

describe("article filters", () => {
  it("defaults to all articles and preserves old true links", () => {
    expect(matchesArticleFilters(article, defaults())).toBe(true);
    expect(parseArticleFilters({ medicalDevice: "true" }).medicalDevice).toBe(true);
    expect(parseArticleFilters({ medicalDevice: "false" }).medicalDevice).toBe(false);
    expect(parseArticleFilters({ category: "Verbandmaterial" }).category).toEqual(["Verbandmaterial"]);
  });
  it("combines fields with AND and choices within each field with OR", () => {
    expect(matches({ category: ["Other", article.category], manufacturer: [article.manufacturer], supplier: [article.defaultSupplierId] })).toBe(true);
    expect(matches({ manufacturer: ["Other"] })).toBe(false);
    expect(matches({ unit: ["Packung"] })).toBe(false);
    expect(matches({ sterile: false })).toBe(false);
    expect(matches({ medicalDevice: false })).toBe(true);
    expect(matches({ medicalDevice: true })).toBe(false);
  });
  it("finds unassigned suppliers and missing data without treating zero as missing", () => {
    expect(matches({ supplier: ["__none__"] })).toBe(false);
    expect(matches({ supplier: ["__none__"] }, { ...article, defaultSupplierId: undefined })).toBe(true);
    expect(matches({ missing: ["price"] }, { ...article, defaultGrossPriceCents: 0 })).toBe(false);
    expect(matches({ missing: ["manufacturer", "barcode"] }, { ...article, manufacturer: " " })).toBe(true);
    expect(matches({ missing: ["articleNumber"] })).toBe(false);
    expect(matches({ missing: ["articleNumber"] }, { ...article, manufacturerPartNumber: "", supplierArticleNumber: "" })).toBe(true);
  });
  it("compares inclusive price ranges using the selected basis", () => {
    const priced = { ...article, defaultGrossPriceCents: 1000, unitsPerPackage: 10 };
    expect(matches({ priceBasis: "unit", priceMin: "1", priceMax: "1,00" }, priced)).toBe(true);
    expect(matches({ priceBasis: "package", priceMin: "10", priceMax: "10" }, priced)).toBe(true);
    expect(matches({ priceBasis: "package", priceMax: "9,99" }, priced)).toBe(false);
    expect(matches({ priceMin: "1" }, { ...article, defaultGrossPriceCents: undefined })).toBe(false);
    expect(matches({ priceBasis: "package" }, { ...priced, unitsPerPackage: undefined })).toBe(false);
    expect(matches({ priceBasis: "unit", priceMin: "3,33", priceMax: "3,34" }, { ...priced, unitsPerPackage: 3 })).toBe(true);
  });
  it("includes exact decimal price boundaries without floating point drift", () => {
    expect(matches({ priceMin: "0,19", priceMax: "0.19" }, { ...article, defaultGrossPriceCents: 57, unitsPerPackage: 3 })).toBe(true);
    expect(matches({ priceMin: "0.29", priceMax: "0,29" }, { ...article, defaultGrossPriceCents: 87, unitsPerPackage: 3 })).toBe(true);
  });
  it("filters package sizes and unknown packages", () => {
    expect(matches({ packageMin: "10", packageMax: "10" })).toBe(true);
    expect(matches({ packageMax: "9" })).toBe(false);
    expect(matches({ packageMissing: true })).toBe(false);
    expect(matches({ packageMissing: true }, { ...article, unitsPerPackage: undefined })).toBe(true);
  });
  it("round trips negatives, arrays and numeric ranges in URLs", () => {
    const filters = { ...defaults(), medicalDevice: false as const, category: ["A", "B"], manufacturer: ["M"], priceMin: "1,20", sterile: true as const };
    expect(parseArticleFilters(serializeArticleFilters(filters))).toEqual(filters);
    expect(serializeArticleFilters(defaults())).toEqual({});
  });
  it("preserves an in-progress decimal while entering a range", () => {
    expect(parseArticleFilters({ priceMin: "1," }).priceMin).toBe("1,");
    expect(parseArticleFilters({ priceMax: 1 }).priceMax).toBe("1");
  });
  it("ignores malformed URL values", () => {
    expect(parseArticleFilters({ manufacturer: ["A", 42, "A"], sterile: "anything", missing: ["oops", "price"], priceMin: "-1", packageMax: "1.5", priceMax: "Infinity" })).toMatchObject({ manufacturer: ["A"], sterile: "", missing: ["price"], priceMin: "", packageMax: "", priceMax: "" });
  });
});
