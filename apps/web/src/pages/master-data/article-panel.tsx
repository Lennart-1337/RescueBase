import { useState } from "react";
import { Plus } from "lucide-react";
import { PanelHeader } from "../../components/panel-header";
import { Button, Panel } from "../../components/ui";
import type { Article } from "../../lib/types";
import { ArticleListRow } from "./article-list-row";
import { ArticleFilters } from "./article-filters";
import { ArticleEditorDialog } from "./article-editor/dialog";
import { useArticleEditor } from "./article-editor/use-article-editor";
import type { ArticlePanelProps } from "./article-panel-types";
import type { ReorderDirection } from "./reorder";
import "./article-panel.css";
export function ArticlePanel(props: ArticlePanelProps) {
  const editor = useArticleEditor(props);
  const [expandedReorderId, setExpandedReorderId] = useState<string | null>(
    null,
  );
  function confirmDelete(article: Article) {
    if (window.confirm(`Artikel "${article.name}" wirklich löschen?`)) {
      props.onDelete(article.id);
    }
  }

  async function moveArticle(articleId: string, direction: ReorderDirection) {
    await props.onMoveArticle(articleId, direction);
  }

  return (
    <>
      <ArticleFilters {...props} />
      <Panel>
        <PanelHeader
          className="article-panel-header"
          description={`${props.articles.length}/${props.totalCount} sichtbar`}
          title="Artikel"
          actions={
            <div className="article-panel-actions">
              {props.reconciliationAction}
              <Button onClick={editor.openForCreate} type="button">
                <Plus data-icon="inline-start" />
                Artikel hinzufügen
              </Button>
            </div>
          }
        />
        <div className="article-table-header" aria-hidden="true">
          <span></span>
          <span>Hinweise</span>
          <span>Lagerhinweise</span>
          <span>Merkmale</span>
          <span></span>
        </div>
        {props.articles.length === 0 ? (
          <div className="compact-list-empty">Noch keine Artikel angelegt.</div>
        ) : null}
        <div className="table article-table">
          {props.articles.map((article, index) => (
            <ArticleListRow
              article={article}
              canMoveDown={index < props.articles.length - 1}
              canMoveUp={index > 0}
              isReorderExpanded={expandedReorderId === article.id}
              isSubmitting={props.isSubmitting}
              key={article.id}
              onDelete={() => confirmDelete(article)}
              onEdit={() => editor.openForEdit(article)}
              onMove={(direction) => void moveArticle(article.id, direction)}
              onToggleReorder={() =>
                setExpandedReorderId((current) =>
                  current === article.id ? null : article.id,
                )
              }
            />
          ))}
        </div>
        <ArticleEditorDialog editor={editor} {...props} />
      </Panel>
    </>
  );
}
