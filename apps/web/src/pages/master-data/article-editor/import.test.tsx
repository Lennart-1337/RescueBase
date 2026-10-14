import type { ArticleImportPreview } from "../../../lib/article-import";
import { StrictMode, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { rescueBaseApi } from "../../../lib/api";
import { emptyDraft } from "./draft";
import type { ArticleDraft } from "./draft";
import { ArticleImport } from "./import";
const url = "https://www.meier-medizintechnik.de/p/1";
const preview: ArticleImportPreview = {
  source: "MEIER_MEDIZINTECHNIK" as const,
  sourceUrl: url,
  fetchedAt: "2026-10-14T12:00:00Z",
  supplierName: "Meier Medizintechnik",
  warnings: [],
  data: {
    name: "Kanülensammler",
    articleUrl: url,
    supplierArticleNumber: "2009068",
  },
};
function Editor({ importOnOpen = false }: { importOnOpen?: boolean } = {}) {
  const [draft, setDraft] = useState<ArticleDraft>({
    ...emptyDraft(),
    isOpen: true,
    articleUrl: url,
    importOnOpen,
  });
  return (
    <>
      <input
        aria-label="Name"
        value={draft.name}
        onChange={(event) =>
          setDraft((value) => ({ ...value, name: event.target.value }))
        }
      />
      <input
        aria-label="URL"
        value={draft.articleUrl}
        onChange={(event) =>
          setDraft((value) => ({ ...value, articleUrl: event.target.value }))
        }
      />
      <ArticleImport draft={draft} setDraft={setDraft} suppliers={[]} />
    </>
  );
}
afterEach(() => vi.restoreAllMocks());
describe("article import UI", () => {
  it("automatically loads a search selection for review without applying it", async () => {
    const load = vi
      .spyOn(rescueBaseApi, "articleImportPreview")
      .mockResolvedValue(preview);
    render(
      <StrictMode>
        <Editor importOnOpen />
      </StrictMode>,
    );
    await screen.findByRole("button", { name: "Ausgewählte Daten übernehmen" });
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith(url);
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });
  it("loads a review and only applies explicitly, retaining later manual edits", async () => {
    const load = vi
      .spyOn(rescueBaseApi, "articleImportPreview")
      .mockResolvedValue(preview);
    render(<Editor />);
    fireEvent.click(
      screen.getByRole("button", { name: "Daten von Meier laden" }),
    );
    await screen.findByRole("button", { name: "Ausgewählte Daten übernehmen" });
    expect(load).toHaveBeenCalledWith(url);
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByText(/Kein eindeutiger Lieferant/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Mein Artikel" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Ausgewählte Daten übernehmen" }),
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Mein Artikel");
    expect(screen.getByRole("status")).toHaveTextContent("Zwischenzeitlich");
  });
  it("shows an error without changing draft values", async () => {
    vi.spyOn(rescueBaseApi, "articleImportPreview").mockRejectedValue(
      new Error("Lieferant nicht erreichbar"),
    );
    render(<Editor />);
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Manuell" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Daten von Meier laden" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Lieferant nicht erreichbar",
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Manuell");
  });
  it("ignores results after URL changes", async () => {
    let resolve!: (value: typeof preview) => void;
    vi.spyOn(rescueBaseApi, "articleImportPreview").mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<Editor />);
    fireEvent.click(
      screen.getByRole("button", { name: "Daten von Meier laden" }),
    );
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://www.meier-medizintechnik.de/p/2" },
    });
    await act(async () => resolve(preview));
    expect(
      screen.queryByRole("button", { name: "Ausgewählte Daten übernehmen" }),
    ).toBeNull();
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });
});

it("keeps loading and applying separate from saving an article", async () => {
  const { ArticlePanel } = await import("../article-panel");
  const create = vi.fn().mockResolvedValue({});
  vi.spyOn(rescueBaseApi, "articleImportPreview").mockResolvedValue(preview);
  render(
    <ArticlePanel
      articles={[]}
      error={null}
      filters={{
        category: "",
        q: "",
        criticalDefault: false,
        medicalDevice: false,
        stkRequired: false,
        mtkRequired: false,
      }}
      isSubmitting={false}
      onFilterChange={() => {}}
      onResetFilters={() => {}}
      onCreate={create}
      onSave={vi.fn()}
      onDelete={() => {}}
      onMoveArticle={vi.fn()}
      suppliers={[]}
      totalCount={0}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Artikel hinzufügen" }));
  fireEvent.change(screen.getByLabelText("Artikel-Link"), {
    target: { value: url },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Daten von Meier laden" }),
  );
  await screen.findByRole("button", { name: "Ausgewählte Daten übernehmen" });
  expect(create).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Ausgewählte Daten übernehmen" }),
  );
  expect(screen.getByLabelText("Lieferanten-Art.-Nr.")).toHaveValue("2009068");
  expect(create).not.toHaveBeenCalled();
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Artikel anlegen" })),
  );
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Kanülensammler",
      supplierArticleNumber: "2009068",
      articleUrl: url,
      unit: "Stück",
    }),
  );
});

it("ignores a pending product request after the editor closes", async () => {
  let resolve!: (value: ArticleImportPreview) => void;
  vi.spyOn(rescueBaseApi, "articleImportPreview").mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const setDraft = vi.fn();
  const view = render(
    <ArticleImport
      draft={{ ...emptyDraft(), isOpen: true, articleUrl: url }}
      setDraft={setDraft}
      suppliers={[]}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Daten von Meier laden" }),
  );
  view.unmount();
  await act(async () => resolve(preview));
  expect(setDraft).not.toHaveBeenCalled();
});
