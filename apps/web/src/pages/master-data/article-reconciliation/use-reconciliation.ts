import { useEffect, useRef, useState } from "react";
import { rescueBaseApi } from "../../../lib/api";
import type { Article } from "../../../lib/types";
import { changedFields, type Change } from "./changes";
import { applySelectedRows } from "./apply-selected";
export type ReviewRow = {
  article: Article;
  status: "pending" | "loading" | "review" | "error" | "saved";
  changes: Change[];
  warnings: string[];
  expectedUpdatedAt?: string;
  error?: string;
};
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Anfrage fehlgeschlagen. Bitte erneut versuchen.";
export function useReconciliation(
  articles: Article[],
  onApplied: () => Promise<unknown>,
) {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [notice, setNotice] = useState("");
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const patch = (id: string, value: Partial<ReviewRow>) =>
    setRows((current) =>
      current.map((row) =>
        row.article.id === id ? { ...row, ...value } : row,
      ),
    );
  function stop() {
    generation.current++;
    setLoading(false);
    setRows((current) =>
      current.map((row) =>
        row.status === "loading" ? { ...row, status: "pending" } : row,
      ),
    );
  }
  async function fetchRow(article: Article, token: number) {
    patch(article.id, { status: "loading", error: undefined, changes: [] });
    try {
      const result = await rescueBaseApi.meierArticlePreview(article.id);
      if (token !== generation.current) return;
      patch(article.id, {
        status: "review",
        expectedUpdatedAt: result.expectedUpdatedAt,
        changes: changedFields(result.current, result.preview.data),
        warnings: result.preview.warnings,
      });
    } catch (error) {
      if (token === generation.current)
        patch(article.id, { status: "error", error: message(error) });
    }
  }
  async function load(selected = articles) {
    const token = ++generation.current;
    setLoading(true);
    setNotice("");
    if (selected === articles)
      setRows(
        selected.map((article) => ({
          article,
          status: "pending",
          changes: [],
          warnings: [],
        })),
      );
    for (let index = 0; index < selected.length; index++) {
      if (token !== generation.current) break;
      if (index) await new Promise((resolve) => setTimeout(resolve, 1100));
      if (token !== generation.current) break;
      await fetchRow(selected[index]!, token);
    }
    if (token === generation.current) setLoading(false);
  }
  function select(
    id: string | null,
    key: Change["key"] | null,
    selected: boolean,
  ) {
    setRows((current) =>
      current.map((row) =>
        id && row.article.id !== id
          ? row
          : {
              ...row,
              changes: row.changes.map((change) =>
                key && change.key !== key ? change : { ...change, selected },
              ),
            },
      ),
    );
  }
  async function apply() {
    setApplying(true);
    setNotice("");
    const count = await applySelectedRows(rows, patch);
    if (count) {
      try {
        await onApplied();
      } catch {
        setNotice(
          "Änderungen gespeichert. Die Artikelliste bitte erneut laden.",
        );
      }
    }
    setNotice(
      (current) =>
        current ||
        `${count} Artikel aktualisiert. Fehlgeschlagene Artikel können erneut geladen werden.`,
    );
    setApplying(false);
  }
  return { rows, loading, applying, notice, load, stop, select, apply };
}
