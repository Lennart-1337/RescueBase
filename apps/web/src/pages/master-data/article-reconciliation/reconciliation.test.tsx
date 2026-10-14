import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { rescueBaseApi } from "../../../lib/api";
import { ArticleReconciliation } from "./index";
import type { MeierArticlePreview } from "../../../lib/article-reconciliation";
import type { Article } from "../../../lib/types";
const article = {
  id: "a",
  name: "Alt",
  articleUrl: "https://www.meier-medizintechnik.de/a/1",
} as Article;
const response: MeierArticlePreview = {
  articleId: "a",
  expectedUpdatedAt: "2026-10-14T12:00:00.000Z",
  current: {
    name: "Alt",
    unit: "Stück",
    articleUrl: article.articleUrl!,
    manufacturer: null,
    manufacturerPartNumber: null,
    supplierArticleNumber: null,
    barcode: null,
    unitsPerPackage: null,
    defaultGrossPriceCents: null,
    medicalDevice: false,
  },
  preview: {
    source: "MEIER_MEDIZINTECHNIK" as const,
    sourceUrl: article.articleUrl!,
    fetchedAt: "2026-10-14T12:00:00.000Z",
    supplierName: "Meier Medizintechnik",
    warnings: [],
    data: { name: "Neu", articleUrl: article.articleUrl! },
  },
};
afterEach(() => vi.restoreAllMocks());
it("reviews all linked articles and saves only selected fields on explicit apply", async () => {
  vi.spyOn(rescueBaseApi, "meierArticlePreview").mockResolvedValue(response);
  const apply = vi
    .spyOn(rescueBaseApi, "meierArticleApply")
    .mockResolvedValue({ ok: true });
  const refresh = vi.fn().mockResolvedValue(undefined);
  render(
    <ArticleReconciliation
      articles={[
        article,
        { ...article, id: "other", articleUrl: "https://example.org/a/1" },
      ]}
      onApplied={refresh}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Meier-Bestandsabgleich" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Abgleich starten" }));
  await screen.findByText("Neu");
  expect(apply).not.toHaveBeenCalled();
  const save = screen.getByRole("button", {
    name: /Ausgewählte Änderungen übernehmen/,
  });
  expect(save).toBeDisabled();
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Name für Alt übernehmen" }),
  );
  fireEvent.click(save);
  await waitFor(() =>
    expect(apply).toHaveBeenCalledWith("a", {
      expectedUpdatedAt: response.expectedUpdatedAt,
      changes: { name: "Neu" },
    }),
  );
  await waitFor(() => expect(refresh).toHaveBeenCalled());
});
it("ignores pending previews after cancellation and never saves", async () => {
  let resolve!: (value: typeof response) => void;
  vi.spyOn(rescueBaseApi, "meierArticlePreview").mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const apply = vi
    .spyOn(rescueBaseApi, "meierArticleApply")
    .mockResolvedValue({ ok: true });
  render(<ArticleReconciliation articles={[article]} onApplied={vi.fn()} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Meier-Bestandsabgleich" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Abgleich starten" }));
  fireEvent.click(screen.getByRole("button", { name: "Abgleich stoppen" }));
  await act(async () => resolve(response));
  expect(screen.queryByText("Neu")).toBeNull();
  expect(apply).not.toHaveBeenCalled();
});
it("keeps failed articles retryable and exposes apply conflicts", async () => {
  vi.spyOn(rescueBaseApi, "meierArticlePreview")
    .mockRejectedValueOnce(new Error("Shop nicht erreichbar"))
    .mockResolvedValue(response);
  vi.spyOn(rescueBaseApi, "meierArticleApply").mockRejectedValue(
    new Error("Artikel zwischenzeitlich geändert"),
  );
  render(<ArticleReconciliation articles={[article]} onApplied={vi.fn()} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Meier-Bestandsabgleich" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Abgleich starten" }));
  await screen.findByText("Shop nicht erreichbar");
  fireEvent.click(screen.getByRole("button", { name: "Erneut laden" }));
  await screen.findByText("Neu");
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Name für Alt übernehmen" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Ausgewählte Änderungen übernehmen/ }),
  );
  await screen.findByText("Artikel zwischenzeitlich geändert");
  expect(screen.getByRole("button", { name: "Erneut laden" })).toBeEnabled();
});
