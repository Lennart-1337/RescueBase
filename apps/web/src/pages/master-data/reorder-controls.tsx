import { ArrowDown, ArrowUp, ChevronsDown, ChevronsUp } from "lucide-react";
import { Button } from "../../components/ui";
import type { ReorderDirection } from "./reorder";
import "./reorder-controls.css";

export function ReorderControls(props: {
  disabled?: boolean;
  isFirst: boolean;
  isLast: boolean;
  label: string;
  onMove: (direction: ReorderDirection) => void;
}) {
  return (
    <div className="reorder-controls">
      <Button aria-label={`${props.label} an den Anfang verschieben`} disabled={props.disabled || props.isFirst} onClick={() => props.onMove("start")} type="button" variant="ghost"><ChevronsUp /></Button>
      <Button aria-label={`${props.label} nach oben verschieben`} disabled={props.disabled || props.isFirst} onClick={() => props.onMove("up")} type="button" variant="ghost"><ArrowUp /></Button>
      <Button aria-label={`${props.label} nach unten verschieben`} disabled={props.disabled || props.isLast} onClick={() => props.onMove("down")} type="button" variant="ghost"><ArrowDown /></Button>
      <Button aria-label={`${props.label} an das Ende verschieben`} disabled={props.disabled || props.isLast} onClick={() => props.onMove("end")} type="button" variant="ghost"><ChevronsDown /></Button>
    </div>
  );
}
