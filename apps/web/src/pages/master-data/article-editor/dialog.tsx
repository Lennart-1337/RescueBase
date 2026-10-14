import { Plus, Save, X } from "lucide-react";
import { Button, Dialog } from "../../../components/ui";
import { InlineError } from "../../../components/state-panels";
import type { ArticlePanelProps } from "../article-panel-types";
import type { useArticleEditor } from "./use-article-editor";
import { ArticleFields } from "./fields";
import { ArticleFlags } from "./flags";
export function ArticleEditorDialog(
  props: Pick<ArticlePanelProps, "error" | "suppliers" | "isSubmitting"> & {
    editor: ReturnType<typeof useArticleEditor>;
  },
) {
  const { editor } = props;
  return (
    <Dialog
      actions={
        <>
          <Button
            disabled={props.isSubmitting}
            onClick={() => editor.close()}
            type="button"
            variant="ghost"
          >
            <X data-icon="inline-start" />
            Abbrechen
          </Button>
          <Button
            disabled={!editor.canSubmit}
            loading={props.isSubmitting}
            onClick={() => void editor.submit()}
            type="button"
          >
            {editor.draft.editingId ? (
              <Save data-icon="inline-start" />
            ) : (
              <Plus data-icon="inline-start" />
            )}
            {editor.draft.editingId ? "Artikel speichern" : "Artikel anlegen"}
          </Button>
        </>
      }
      onClose={() => editor.close()}
      open={editor.draft.isOpen}
      size="wide"
      title={editor.draft.editingId ? "Artikel bearbeiten" : "Artikel anlegen"}
    >
      <div className="article-editor-layout">
        <ArticleFields
          draft={editor.draft}
          setDraft={editor.setDraft}
          suppliers={props.suppliers}
        />
        <ArticleFlags draft={editor.draft} setDraft={editor.setDraft} />
      </div>
      {props.error ? <InlineError error={props.error} /> : null}
    </Dialog>
  );
}
