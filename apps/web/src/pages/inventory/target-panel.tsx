import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { ListRow, RowActions } from "../../components/list-row";
import { PanelHeader } from "../../components/panel-header";
import { InlineError } from "../../components/state-panels";
import { AnchorButton, Badge, Button, Panel } from "../../components/ui";
import type { InventoryTarget } from "../../lib/types";

export function TargetPanel(props: {
  error: Error | null;
  isSubmitting: boolean;
  onClear: (target: InventoryTarget) => void;
  onCreate: () => void;
  onEdit: (target: InventoryTarget) => void;
  targets: InventoryTarget[];
  totalCount: number;
}) {
  return (
    <Panel>
      <PanelHeader title="Sollbestände" actions={(
        <div className="topbar-actions">
          <Badge tone="info">{props.targets.length}/{props.totalCount} sichtbar</Badge>
          <Button onClick={props.onCreate} type="button"><Plus data-icon="inline-start" />Soll hinzufügen</Button>
        </div>
      )} />
      {props.error ? <InlineError error={props.error} /> : null}
      <div className="compact-list">
        {props.targets.map((target) => (
          <ListRow key={target.id} title={target.article.name} meta={`${target.location.name} · Ist ${target.currentQuantity}/${target.targetQuantity} ${target.article.unit}`} actions={(
            <RowActions>
              <Badge tone={target.shortageQuantity > 0 ? "warning" : "ready"}>
                {target.shortageQuantity > 0 ? `${target.shortageQuantity} fehlt` : "gedeckt"}
              </Badge>
              {target.article.articleUrl ? <AnchorButton href={target.article.articleUrl} rel="noreferrer" target="_blank" variant="secondary"><ExternalLink data-icon="inline-start" />Link</AnchorButton> : null}
              <Button onClick={() => props.onEdit(target)} type="button" variant="secondary"><Pencil data-icon="inline-start" />Bearbeiten</Button>
              <Button disabled={props.isSubmitting} onClick={() => props.onClear(target)} type="button" variant="danger"><Trash2 data-icon="inline-start" />Löschen</Button>
            </RowActions>
          )} />
        ))}
      </div>
      {props.targets.length === 0 ? <div className="compact-list-empty">Keine Sollbestände für die gesetzten Filter.</div> : null}
    </Panel>
  );
}
