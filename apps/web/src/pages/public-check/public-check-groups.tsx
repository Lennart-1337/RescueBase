import { Stepper } from "../../components/stepper";
import { Badge, Panel } from "../../components/ui";
import type { CheckLineState, GroupedTemplatePosition } from "../../lib/check";

export function CheckGroups(props: {
  groupedPositions: GroupedTemplatePosition[];
  linesById: Map<string, CheckLineState>;
  onUpdateLine: (positionId: string, patch: Partial<CheckLineState>) => void;
}) {
  return (
    <section className="check-list">
      {props.groupedPositions.map((group) => (
        <section aria-label={`Modul ${group.title}`} className="check-group" key={group.key}>
          <div className="check-group-header"><h2>{group.title}</h2><span>{group.positions.length} Positionen</span></div>
          {group.positions.map((position) => {
            const line = props.linesById.get(position.id);
            return (
              <Panel className="check-item" key={position.id}>
                <div className="check-item-header">
                  <div>
                    <span>Materialposition</span>
                    <h3>{position.articleName}</h3>
                    <p>Soll {position.requiredQuantity} {position.unit}</p>
                  </div>
                  {position.critical ? <Badge className="check-item-critical" tone="neutral">kritisch</Badge> : null}
                </div>
                <Stepper label="Ist" onChange={(value) => props.onUpdateLine(position.id, { countedQuantity: value })} value={line?.countedQuantity ?? 0} />
                <Stepper label="Verworfen" onChange={(value) => props.onUpdateLine(position.id, { discardedExpiredQuantity: value })} value={line?.discardedExpiredQuantity ?? 0} />
              </Panel>
            );
          })}
        </section>
      ))}
    </section>
  );
}
