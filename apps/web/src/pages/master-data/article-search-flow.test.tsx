import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { rescueBaseApi } from "../../lib/api";
import type { ArticleImportPreview } from "../../lib/article-import";
import { article } from "../../test-support/fixtures";
import { ArticlePanel } from "./article-panel";
const url = "https://www.meier-medizintechnik.de/kanuelensammler/2009068";
const preview: ArticleImportPreview = {
  source: "MEIER_MEDIZINTECHNIK" as const,
  sourceUrl: url,
  fetchedAt: "2026-10-14T12:00:00Z",
  supplierName: "Meier Medizintechnik",
  warnings: [],
  data: {
    name: "Kanülensammler",
    articleUrl: url,
    unit: "Set",
    medicalDevice: true,
    supplierArticleNumber: "2009068",
  },
};
function setup(existing = false) {
  const create = vi.fn().mockResolvedValue({});
  const save = vi.fn().mockResolvedValue({});
  vi.spyOn(rescueBaseApi, "meierArticleSearch").mockResolvedValue({
    query: "Kanüle",
    page: 1,
    totalPages: 1,
    items: [{ name: "Kanülensammler", url, supplierArticleNumber: "2009068" }],
    warnings: [],
  });
  vi.spyOn(rescueBaseApi, "articleImportPreview").mockResolvedValue(preview);
  render(
    <ArticlePanel
      articles={[]}
      allArticles={
        existing
          ? [
              {
                ...article,
                articleUrl: url,
                stkIntervalMonths: undefined,
                mtkIntervalMonths: undefined,
              },
            ]
          : []
      }
      error={null}
      filters={{
        category: "",
        q: "hidden",
        criticalDefault: false,
        medicalDevice: false,
        mtkRequired: false,
        stkRequired: false,
      }}
      isSubmitting={false}
      onCreate={create}
      onSave={save}
      onDelete={vi.fn()}
      onFilterChange={vi.fn()}
      onResetFilters={vi.fn()}
      onMoveArticle={vi.fn()}
      suppliers={[]}
      totalCount={existing ? 1 : 0}
    />,
  );
  return { create, save };
}
afterEach(() => vi.restoreAllMocks());
async function search() {
  fireEvent.click(
    screen.getByRole("button", { name: "Meier-Shop durchsuchen" }),
  );
  fireEvent.change(screen.getByLabelText("Suchbegriff"), {
    target: { value: "Kanüle" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Suchen" }));
}
it("loads the selected search product for review and saves only after explicit application and save", async () => {
  const { create, save } = setup();
  await search();
  fireEvent.click(await screen.findByRole("button", { name: "Daten prüfen" }));
  await screen.findByRole("button", { name: "Ausgewählte Daten übernehmen" });
  expect(screen.getByLabelText("Name")).toHaveValue("");
  expect(create).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Ausgewählte Daten übernehmen" }),
  );
  expect(screen.getByLabelText("Name")).toHaveValue("Kanülensammler");
  expect(create).not.toHaveBeenCalled();
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Artikel anlegen" })),
  );
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Kanülensammler",
      supplierArticleNumber: "2009068",
      articleUrl: url,
      unit: "Set",
      medicalDevice: true,
    }),
  );
});
it("opens a filtered-out existing article instead of creating a duplicate and preserves manual fields", async () => {
  const { create, save } = setup(true);
  await search();
  fireEvent.click(
    await screen.findByRole("button", { name: "Vorhandenen Artikel prüfen" }),
  );
  await screen.findByRole("button", { name: "Ausgewählte Daten übernehmen" });
  expect(screen.getByLabelText("Name")).toHaveValue(article.name);
  fireEvent.click(
    screen.getByRole("button", { name: "Ausgewählte Daten übernehmen" }),
  );
  expect(screen.getByLabelText("Name")).toHaveValue(article.name);
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Artikel speichern" })),
  );
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      article.id,
      expect.objectContaining({
        name: article.name,
        notes: article.notes,
        supplierArticleNumber: "2009068",
      }),
    ),
  );
  expect(create).not.toHaveBeenCalled();
});
