import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import type { Article } from "../../lib/types";
import { AnchorButton, Badge, Button } from "../../components/ui";
import "./article-list-row.css";

export function ArticleListRow(props: {
  article: Article;
  isSubmitting: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { article } = props;
  const complianceSummary = [article.stkRequired ? `STK ${article.stkIntervalMonths ?? "?"}M` : null, article.mtkRequired ? `MTK ${article.mtkIntervalMonths ?? "?"}M` : null].filter(Boolean).join(" · ");

  return (
    <div className="table-row article-list-row">
      <span className="article-row-main">
        <strong>{article.name}</strong>
        <small>{article.unit}{article.barcode ? ` · ${article.barcode}` : ""}</small>
      </span>
      <span className="article-row-detail">
        <strong>Hinweise</strong>
        <small>{article.notes || ""}</small>
      </span>
      <span className="article-row-detail">
        <strong>Lagerhinweise</strong>
        <small>{article.storageNotes || ""}</small>
      </span>
      <span className="article-row-detail">
        <strong>Prüfungen</strong>
        <small>{complianceSummary || "Keine Pflichtprüfungen"}</small>
      </span>
      <div className="article-row-badges article-row-flags">
        {article.medicalDevice ? <Badge tone="info">MPDG</Badge> : null}
        {article.sterile ? <Badge tone="info">steril</Badge> : null}
        {article.criticalDefault ? <Badge tone="info">kritisch</Badge> : null}
      </div>
      <div className="article-row-actions row-action-buttons">
        {article.articleUrl ? <AnchorButton className="mobile-icon-button" href={article.articleUrl} rel="noreferrer" target="_blank" variant="secondary"><ExternalLink data-icon="inline-start" /><span className="button-label">Link</span></AnchorButton> : null}
        <Button className="mobile-icon-button" onClick={props.onEdit} type="button" variant="ghost">
          <Pencil data-icon="inline-start" />
          <span className="button-label">Bearbeiten</span>
        </Button>
        <Button
          aria-label={`${article.name} löschen`}
          className="mobile-icon-button"
          disabled={props.isSubmitting}
          onClick={props.onDelete}
          type="button"
          variant="danger"
        >
          <Trash2 data-icon="inline-start" />
          <span className="button-label">Löschen</span>
        </Button>
      </div>
    </div>
  );
}
