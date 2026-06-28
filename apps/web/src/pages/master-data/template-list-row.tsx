import { Copy, Pencil, Trash2 } from "lucide-react";
import { RowActions } from "../../components/list-row";
import { Badge, Button } from "../../components/ui";
import type { KitTemplate } from "../../lib/types";
import "./template-list-row.css";

export function TemplateListRow(props: {
  isSubmitting: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  template: KitTemplate;
}) {
  const { template } = props;
  const criticalPositions = template.positions.filter((position) => position.critical).length;

  return (
    <div className="table-row template-row">
      <span className="template-row-main">
        <strong>{template.name}</strong>
        <small>Version {template.version}</small>
      </span>
      <RowActions className="template-row-actions">
        {criticalPositions > 0 ? <Badge tone="info">kritisch</Badge> : null}
        <Button aria-label={`${template.name} v${template.version} duplizieren`} className="mobile-icon-button" onClick={props.onDuplicate} type="button" variant="ghost"><Copy data-icon="inline-start" /><span className="button-label">Duplizieren</span></Button>
        <Button className="mobile-icon-button" onClick={props.onEdit} type="button" variant="ghost"><Pencil data-icon="inline-start" /><span className="button-label">Bearbeiten</span></Button>
        <Button aria-label={`${template.name} v${template.version} löschen`} className="mobile-icon-button" disabled={props.isSubmitting} onClick={props.onDelete} type="button" variant="danger"><Trash2 data-icon="inline-start" /><span className="button-label">Löschen</span></Button>
      </RowActions>
    </div>
  );
}
