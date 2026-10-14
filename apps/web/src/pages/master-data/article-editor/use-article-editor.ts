import { useState } from "react";
import type { Article } from "../../../lib/types";
import type { ArticlePanelProps } from "../article-panel-types";
import { articleBody, articleDraft } from "./conversions";
import { emptyDraft, intervalsValid, unitsPerPackageValid } from "./draft";
export function useArticleEditor(
  props: Pick<ArticlePanelProps, "onSave" | "onCreate">,
) {
  const [draft, setDraft] = useState(emptyDraft());
  const canSubmit = Boolean(
    draft.name.trim() &&
    draft.unit.trim() &&
    intervalsValid(draft) &&
    unitsPerPackageValid(draft.unitsPerPackage),
  );
  const close = () => setDraft(emptyDraft());
  const openForCreate = () => setDraft({ ...emptyDraft(), isOpen: true });
  const openForEdit = (article: Article) => setDraft(articleDraft(article));
  const openForImport = (articleUrl: string, article?: Article) =>
    setDraft({
      ...(article ? articleDraft(article) : emptyDraft()),
      isOpen: true,
      articleUrl,
      importOnOpen: true,
    });
  async function submit() {
    if (!canSubmit) return;
    const body = articleBody(draft);
    const succeeded = await (
      draft.editingId
        ? props.onSave(draft.editingId, body)
        : props.onCreate(body)
    )
      .then(() => true)
      .catch(() => false);
    if (succeeded) close();
  }
  return {
    draft,
    setDraft,
    canSubmit,
    close,
    openForCreate,
    openForEdit,
    openForImport,
    submit,
  };
}
