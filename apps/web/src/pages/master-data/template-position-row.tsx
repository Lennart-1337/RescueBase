import { Trash2 } from "lucide-react";
import { SearchableSelect } from "../../components/searchable-select";
import { Button, CheckboxField, Field } from "../../components/ui";
import { ReorderControls } from "./reorder-controls";
import type { ReorderDirection } from "./reorder";

type Position = { articleId: string; critical: boolean; moduleName: string; requiredQuantity: number };

export function TemplatePositionRow(props: {
  articles: { id: string; name: string; shortName?: string }[];
  position: Position;
  index: number;
  count: number;
  isSubmitting: boolean;
  autoFocus?: boolean;
  onUpdate: (patch: Partial<Position>) => void;
  onRemove: () => void;
  onMove: (direction: ReorderDirection) => void;
}) {
  const { position, index } = props;
  return (
    <div className="template-position-row">
      <Field label="Artikel"><SearchableSelect showSelectedHelp disabled={props.articles.length === 0} onChange={(articleId) => props.onUpdate({ articleId })} options={props.articles.map((article) => ({ label: article.name, value: article.id, keywords: article.shortName ? [article.shortName] : [] }))} value={position.articleId || props.articles[0]?.id || ""} /></Field>
      <Field label="Modul"><input autoFocus={props.autoFocus} onChange={(event) => props.onUpdate({ moduleName: event.target.value })} value={position.moduleName} /></Field>
      <Field label="Sollmenge"><input min="1" onChange={(event) => props.onUpdate({ requiredQuantity: Number(event.target.value) })} type="number" value={position.requiredQuantity} /></Field>
      <CheckboxField checked={position.critical} className="template-critical" label="Kritisch" onChange={(event) => props.onUpdate({ critical: event.target.checked })} />
      <ReorderControls disabled={props.isSubmitting} isFirst={index === 0} isLast={index === props.count - 1} label={`Position ${index + 1}`} onMove={props.onMove} />
      <Button aria-label={`Position ${index + 1} entfernen`} title="Position entfernen" className="template-position-remove" disabled={props.count === 1} onClick={props.onRemove} type="button" variant="ghost"><Trash2 aria-hidden="true" /></Button>
    </div>
  );
}
