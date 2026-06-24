import { Copy, Pencil, Trash2 } from "lucide-react";
import { Badge, Button } from "../../components/ui";
import type { KitTemplate } from "../../lib/types";

export function TemplateListRow(props: {
  isSubmitting: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  template: KitTemplate;
}) {
  const { template } = props;
  const criticalPositions = template.positions.filter((position) => position.critical).length;
  const totalRequiredQuantity = template.positions.reduce((sum, position) => sum + position.requiredQuantity, 0);
  const moduleSummary = summarizeModules(template);

  return (
    <div className="table-row template-row">
      <span className="template-row-main">
        <strong>{template.name}</strong>
        <small>Version {template.version}</small>
      </span>
      <span className="template-row-detail">
        <strong>Module</strong>
        <small>{moduleSummary}</small>
      </span>
      <span className="template-row-detail">
        <strong>{template.positions.length} Positionen</strong>
        <small>Soll gesamt {totalRequiredQuantity}{criticalPositions > 0 ? ` · ${criticalPositions} kritisch` : ""}</small>
      </span>
      <div className="row-actions template-row-actions">
        {criticalPositions > 0 ? <Badge tone="info">kritisch</Badge> : null}
        <Button aria-label={`${template.name} v${template.version} duplizieren`} className="mobile-icon-button" onClick={props.onDuplicate} type="button" variant="ghost"><Copy data-icon="inline-start" /><span className="button-label">Duplizieren</span></Button>
        <Button className="mobile-icon-button" onClick={props.onEdit} type="button" variant="ghost"><Pencil data-icon="inline-start" /><span className="button-label">Bearbeiten</span></Button>
        <Button aria-label={`${template.name} v${template.version} löschen`} className="mobile-icon-button" disabled={props.isSubmitting} onClick={props.onDelete} type="button" variant="danger"><Trash2 data-icon="inline-start" /><span className="button-label">Löschen</span></Button>
      </div>
    </div>
  );
}

function summarizeModules(template: KitTemplate) {
  const modules = Array.from(new Set(template.positions.map((position) => position.moduleName?.trim() || "Ohne Modul")));
  if (modules.length <= 2) return modules.join(" · ");
  return `${modules.slice(0, 2).join(" · ")} +${modules.length - 2}`;
}
