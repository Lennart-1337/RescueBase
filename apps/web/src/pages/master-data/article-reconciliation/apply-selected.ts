import { rescueBaseApi } from "../../../lib/api";
import { selectedChanges } from "./changes";
import type { ReviewRow } from "./use-reconciliation";
export async function applySelectedRows(
  rows: ReviewRow[],
  patch: (id: string, value: Partial<ReviewRow>) => void,
) {
  let count = 0;
  for (const row of rows) {
    const changes = selectedChanges(row.changes);
    if (
      !Object.keys(changes).length ||
      !row.expectedUpdatedAt ||
      row.status !== "review"
    )
      continue;
    try {
      await rescueBaseApi.meierArticleApply(row.article.id, {
        expectedUpdatedAt: row.expectedUpdatedAt,
        changes,
      });
      patch(row.article.id, {
        status: "saved",
        changes: [],
        error: undefined,
      });
      count++;
    } catch (error) {
      patch(row.article.id, {
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Speichern fehlgeschlagen. Bitte erneut laden.",
        changes: [],
      });
    }
  }
  return count;
}
