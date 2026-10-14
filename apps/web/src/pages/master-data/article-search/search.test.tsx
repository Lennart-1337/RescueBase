import { act, fireEvent, render, screen } from "@testing-library/react";
import { rescueBaseApi } from "../../../lib/api";
import type { Article } from "../../../lib/types";
import { ArticleSearch } from "./search";
const url = "https://www.meier-medizintechnik.de/produkt/hak-11";
const result = {
  warnings: [],
  query: "Katheter",
  page: 1,
  totalPages: 2,
  items: [
    {
      name: "Katheter CH 12",
      url,
      supplierArticleNumber: "HAK/11",
      priceLabel: "0,28 €",
    },
  ],
};
const select = vi.fn();
function start() {
  fireEvent.click(
    screen.getByRole("button", { name: "Meier-Shop durchsuchen" }),
  );
  fireEvent.change(screen.getByLabelText("Suchbegriff"), {
    target: { value: "  Katheter  " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Suchen" }));
}
afterEach(() => {
  vi.restoreAllMocks();
  select.mockReset();
});
it("searches explicitly, paginates all results and opens review without writing", async () => {
  const load = vi
    .spyOn(rescueBaseApi, "meierArticleSearch")
    .mockResolvedValue(result);
  const create = vi.spyOn(rescueBaseApi, "createArticle");
  render(<ArticleSearch articles={[]} onSelect={select} />);
  start();
  await screen.findByText("Katheter CH 12");
  expect(load).toHaveBeenCalledWith({ query: "Katheter", page: 1 });
  fireEvent.click(screen.getByRole("button", { name: "Nächste Seite" }));
  expect(load).toHaveBeenLastCalledWith({ query: "Katheter", page: 2 });
  await screen.findByRole("button", { name: "Daten prüfen" });
  fireEvent.click(screen.getByRole("button", { name: "Daten prüfen" }));
  expect(select).toHaveBeenCalledWith(url, undefined);
  expect(create).not.toHaveBeenCalled();
});
it("opens matching existing Meier articles despite SKU casing and slash differences", async () => {
  vi.spyOn(rescueBaseApi, "meierArticleSearch").mockResolvedValue(result);
  render(
    <ArticleSearch
      articles={[
        {
          id: "existing",
          articleUrl: "https://www.meier-medizintechnik.de/alter-name/HAK-11",
          supplierArticleNumber: "HAK/11",
        } as Article,
      ]}
      onSelect={select}
    />,
  );
  start();
  expect(await screen.findByText("Bereits vorhanden")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Vorhandenen Artikel prüfen" }),
  );
  expect(select).toHaveBeenCalledWith(url, "existing");
});
it("reports failures and retries the requested page", async () => {
  const load = vi
    .spyOn(rescueBaseApi, "meierArticleSearch")
    .mockRejectedValueOnce(new Error("Meier nicht erreichbar"))
    .mockResolvedValue(result);
  render(<ArticleSearch articles={[]} onSelect={select} />);
  start();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Meier nicht erreichbar",
  );
  fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
  await screen.findByText("Katheter CH 12");
  expect(load).toHaveBeenCalledTimes(2);
});
it("invalidates pending results when the search term changes", async () => {
  let resolve!: (value: typeof result) => void;
  vi.spyOn(rescueBaseApi, "meierArticleSearch").mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  render(<ArticleSearch articles={[]} onSelect={select} />);
  start();
  fireEvent.change(screen.getByLabelText("Suchbegriff"), {
    target: { value: "Maske" },
  });
  await act(async () => resolve(result));
  expect(screen.queryByText("Katheter CH 12")).toBeNull();
});
it("requires 2 to 120 characters and never searches while typing", () => {
  const load = vi.spyOn(rescueBaseApi, "meierArticleSearch");
  render(<ArticleSearch articles={[]} onSelect={select} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Meier-Shop durchsuchen" }),
  );
  fireEvent.change(screen.getByLabelText("Suchbegriff"), {
    target: { value: "a" },
  });
  expect(screen.getByRole("button", { name: "Suchen" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Suchbegriff"), {
    target: { value: "a".repeat(121) },
  });
  expect(screen.getByRole("button", { name: "Suchen" })).toBeDisabled();
  expect(load).not.toHaveBeenCalled();
});

it("does not show results or stale errors after closing a pending search", async () => {
  let reject!: (error: Error) => void;
  vi.spyOn(rescueBaseApi, "meierArticleSearch").mockReturnValue(
    new Promise((_resolve, fail) => {
      reject = fail;
    }),
  );
  render(<ArticleSearch articles={[]} onSelect={select} />);
  start();
  fireEvent.click(screen.getByRole("button", { name: "Dialog schließen" }));
  await act(async () => reject(new Error("Alte Anfrage")));
  fireEvent.click(
    screen.getByRole("button", { name: "Meier-Shop durchsuchen" }),
  );
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByText("Katheter CH 12")).toBeNull();
});
it("retries a failed later page without falling back to the first page", async () => {
  const load = vi
    .spyOn(rescueBaseApi, "meierArticleSearch")
    .mockResolvedValueOnce(result)
    .mockRejectedValueOnce(new Error("Timeout"))
    .mockResolvedValue({ ...result, page: 2 });
  render(<ArticleSearch articles={[]} onSelect={select} />);
  start();
  await screen.findByText("Katheter CH 12");
  fireEvent.click(screen.getByRole("button", { name: "Nächste Seite" }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
  await screen.findByText("Seite 2 von 2");
  expect(load).toHaveBeenLastCalledWith({ query: "Katheter", page: 2 });
  expect(screen.getByRole("button", { name: "Nächste Seite" })).toBeDisabled();
});
it("blocks ambiguous existing matches and displays empty search results", async () => {
  const load = vi
    .spyOn(rescueBaseApi, "meierArticleSearch")
    .mockResolvedValue(result);
  render(
    <ArticleSearch
      articles={[
        { id: "one", articleUrl: url } as Article,
        { id: "two", articleUrl: url } as Article,
      ]}
      onSelect={select}
    />,
  );
  start();
  await screen.findByText(/Mehrfach vorhanden/);
  expect(
    screen.getByRole("button", { name: "Vorhandenen Artikel prüfen" }),
  ).toBeDisabled();
  load.mockResolvedValue({ ...result, totalPages: 1, items: [] });
  fireEvent.click(screen.getByRole("button", { name: "Suchen" }));
  expect(
    await screen.findByText(/Keine Produkte gefunden/),
  ).toBeInTheDocument();
});
