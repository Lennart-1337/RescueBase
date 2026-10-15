import { article } from "../../../test-support/fixtures";
import type { Article } from "../../../lib/types";
import { articleBody, articleDraft } from "./conversions";
import { emptyDraft } from "./draft";
const legacyArticle: Article = { ...article, stkIntervalMonths: undefined, mtkIntervalMonths: undefined };

it("loads and trims a short name while preserving the full name", () => {
  const draft = articleDraft({ ...legacyArticle, shortName: "  Verbandpäckchen  " });
  expect(draft.shortName).toBe("  Verbandpäckchen  ");
  expect(articleBody(draft)).toMatchObject({ name: article.name, shortName: "Verbandpäckchen" });
});

it("explicitly clears a short name on edit and supports legacy articles", () => {
  const draft = articleDraft(legacyArticle);
  expect(draft.shortName).toBe("");
  expect(articleBody({ ...draft, shortName: "  " })).toHaveProperty("shortName", "");
  expect(emptyDraft().shortName).toBe("");
});
