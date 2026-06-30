import { ArrowDownUp, ExternalLink, Pencil, Trash2 } from "lucide-react";
import type { Article } from "../../lib/types";
import { RowActions } from "../../components/list-row";
import { AnchorButton, Badge, Button } from "../../components/ui";
import { formatMoney } from "../purchase-orders/format";
import type { ReorderDirection } from "./reorder";
import { ReorderControls } from "./reorder-controls";
import "./article-list-row.css";

export function ArticleListRow(props: {
  article: Article;
  canMoveDown: boolean;
  canMoveUp: boolean;
  isReorderExpanded: boolean;
  isSubmitting: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onMove: (direction: ReorderDirection) => void;
  onToggleReorder: () => void;
}) {
  const { article } = props;

  return (
    <div className="table-row article-list-row">
      <span className="article-row-main">
        <strong>{article.name}</strong>
        <small>{article.unit}{article.barcode ? ` · ${article.barcode}` : ""}{article.defaultSupplierName ? ` · ${article.defaultSupplierName}` : ""}</small>
      </span>
      <span className="article-row-detail">
        <small>{article.notes || ""}</small>
      </span>
      <span className="article-row-detail">
        <small>{article.storageNotes || ""}</small>
      </span>

      <div className="article-row-badges article-row-flags">
        {article.medicalDevice ? <Badge>MPDG</Badge> : null}
        {article.sterile ? <Badge>steril</Badge> : null}
        {article.criticalDefault ? <Badge>kritisch</Badge> : null}
        {article.stkRequired ? <Badge>STK</Badge> : null}
        {article.mtkRequired ? <Badge>MTK</Badge> : null}
        {typeof article.defaultGrossPriceCents === "number" ? <Badge>{formatMoney(article.defaultGrossPriceCents)}</Badge> : null}
      </div>
      <RowActions className={`article-row-actions${props.isReorderExpanded ? " article-row-actions-expanded" : ""}`}>
        <Button
          aria-expanded={props.isReorderExpanded}
          className="mobile-icon-button article-sort-button"
          onClick={props.onToggleReorder}
          type="button"
          variant={props.isReorderExpanded ? "secondary" : "ghost"}
        >
          <ArrowDownUp data-icon="inline-start" />
          <span className="button-label">Sortieren</span>
        </Button>
        {props.isReorderExpanded ? <ReorderControls disabled={props.isSubmitting} isFirst={!props.canMoveUp} isLast={!props.canMoveDown} label={article.name} onMove={props.onMove} /> : null}
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
      </RowActions>
    </div>
  );
}
