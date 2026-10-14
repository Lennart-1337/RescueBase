import type { Article } from "../../../lib/types";
import { matchingArticles } from "./duplicates";
const item = {
  name: "Stauer",
  url: "https://www.meier-medizintechnik.de/stauer/hvs01-25w-b-v2.0",
  supplierArticleNumber: "HVS01 25W/B V2.0",
};
const article = (id: string, articleUrl: string, supplierArticleNumber = "") =>
  ({ id, articleUrl, supplierArticleNumber }) as Article;
it("does not confuse a selected variant with the listing's group article number", () => {
  const selected = {
    name: "Binde",
    url: "https://www.meier-medizintechnik.de/binde/9310910",
    supplierArticleNumber: "9310900",
  };
  expect(
    matchingArticles(
      [
        article(
          "other",
          "https://www.meier-medizintechnik.de/binde/9310900",
          "9310900",
        ),
      ],
      selected,
    ),
  ).toEqual([]);
});
it("matches source identifiers across case, spaces, slashes and renamed slugs", () => {
  expect(
    matchingArticles(
      [
        article(
          "match",
          "https://meier-medizintechnik.de/old/HVS01-25W-B-V2.0/?tracking=1",
        ),
      ],
      item,
    ).map((entry) => entry.id),
  ).toEqual(["match"]);
});
it("does not collide with foreign suppliers or distinct variants", () => {
  expect(
    matchingArticles(
      [
        article(
          "foreign",
          "https://other.test/p/hvs01-25w-b-v2.0",
          item.supplierArticleNumber,
        ),
        article(
          "fake",
          "https://meier-medizintechnik.de.evil.test/p/hvs01-25w-b-v2.0",
          item.supplierArticleNumber,
        ),
        article(
          "other",
          "https://www.meier-medizintechnik.de/p/hvs01-25w-b-v3.0",
        ),
      ],
      item,
    ),
  ).toEqual([]);
});
it("preserves ambiguous duplicate matches for the UI to block new creation", () => {
  expect(
    matchingArticles(
      [
        article("first", item.url),
        article(
          "second",
          "https://www.meier-medizintechnik.de/p/else",
          item.supplierArticleNumber,
        ),
      ],
      item,
    ),
  ).toHaveLength(2);
});
it("handles malformed legacy URLs safely", () => {
  expect(
    matchingArticles(
      [article("broken", "not a URL", item.supplierArticleNumber)],
      item,
    ),
  ).toEqual([]);
});
it("recognizes manually entered Meier supplier SKUs without product links", () => {
  const manual = {
    id: "manual",
    defaultSupplierName: "Meier-Medizintechnik GmbH",
    supplierArticleNumber: item.supplierArticleNumber,
  } as Article;
  expect(matchingArticles([manual], item).map((entry) => entry.id)).toEqual([
    "manual",
  ]);
  expect(
    matchingArticles(
      [{ ...manual, defaultSupplierName: "Meier Medizintechnik" }],
      item,
    ),
  ).toHaveLength(1);
});
it("does not treat similar supplier names as Meier", () => {
  expect(
    matchingArticles(
      [
        {
          id: "other",
          defaultSupplierName: "Meier Medizintechnik Service",
          supplierArticleNumber: item.supplierArticleNumber,
        } as Article,
      ],
      item,
    ),
  ).toEqual([]);
});
