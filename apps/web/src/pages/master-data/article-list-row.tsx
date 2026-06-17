import { Pencil, Trash2 } from "lucide-react";
import type { Article } from "../../lib/types";
import { Badge, Button } from "../../components/ui";

export function ArticleListRow(props: {
  article: Article;
  isSubmitting: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { article } = props;
  const subtitle = [article.unit, article.manufacturer, article.category].filter(Boolean).join(" · ");

  return (
    <div className="compact-list-row compact-list-row-actions article-list-row">
      <span className="article-row-summary">
        <strong>{article.name}</strong>
        <small>{subtitle}</small>
      </span>
      <div className="article-row-badges">
        {article.medicalDevice ? <Badge tone="info">MPDG</Badge> : null}
        {article.stkRequired ? <Badge tone="info">STK {article.stkIntervalMonths ?? "?"}M</Badge> : null}
        {article.mtkRequired ? <Badge tone="info">MTK {article.mtkIntervalMonths ?? "?"}M</Badge> : null}
        {article.sterile ? <Badge tone="info">steril</Badge> : null}
        {article.criticalDefault ? <Badge tone="info">kritisch</Badge> : null}
      </div>
      <div className="row-action-buttons">
        <Button onClick={props.onEdit} type="button" variant="ghost">
          <Pencil data-icon="inline-start" />
          Bearbeiten
        </Button>
        <Button
          aria-label={`${article.name} löschen`}
          disabled={props.isSubmitting}
          onClick={props.onDelete}
          type="button"
          variant="danger"
        >
          <Trash2 data-icon="inline-start" />
          Löschen
        </Button>
      </div>
    </div>
  );
}
