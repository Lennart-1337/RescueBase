import type { ReactNode } from "react";
import { cn } from "./ui";
import "./panel-header.css";

export function PanelHeader(props: {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className={cn("panel-header", props.className)}>
      <div>
        <h2>{props.title}</h2>
        {props.description ? <p>{props.description}</p> : null}
      </div>
      {props.actions ?? props.icon ?? null}
    </div>
  );
}
