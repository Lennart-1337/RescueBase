import { rescueBaseApi } from "../../../lib/api";
import type { Article } from "../../../lib/types";
import { applySelectedRows } from "./apply-selected";
import type { ReviewRow } from "./use-reconciliation";

function row(id: string): ReviewRow {
  return {
    article: { id, name: id } as Article,
    status: "review",
    expectedUpdatedAt: "2026-10-14T10:00:00.000Z",
    changes: [
      { key: "name", previous: id, next: `${id} neu`, selected: true },
      { key: "unit", previous: "Stück", next: "Paar", selected: false },
    ],
    warnings: [],
  };
}

afterEach(() => vi.restoreAllMocks());
it("continues a batch after a conflict without resaving completed articles", async () => {
  const apply = vi
    .spyOn(rescueBaseApi, "meierArticleApply")
    .mockResolvedValueOnce({ ok: true })
    .mockRejectedValueOnce(new Error("Zwischenzeitlich geändert"))
    .mockResolvedValueOnce({ ok: true });
  let rows = [row("a"), row("b"), row("c")];
  const patch = (id: string, value: Partial<ReviewRow>) => {
    rows = rows.map((entry) =>
      entry.article.id === id ? { ...entry, ...value } : entry,
    );
  };
  expect(await applySelectedRows(rows, patch)).toBe(2);
  expect(rows.map((entry) => entry.status)).toEqual([
    "saved",
    "error",
    "saved",
  ]);
  expect(rows[1]!.error).toBe("Zwischenzeitlich geändert");
  expect(apply.mock.calls.map(([id, body]) => [id, body.changes])).toEqual([
    ["a", { name: "a neu" }],
    ["b", { name: "b neu" }],
    ["c", { name: "c neu" }],
  ]);
  expect(await applySelectedRows(rows, patch)).toBe(0);
  expect(apply).toHaveBeenCalledTimes(3);
});
