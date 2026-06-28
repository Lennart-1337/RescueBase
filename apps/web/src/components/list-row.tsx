import type { ReactNode } from "react";
import { cn } from "./ui";
import "./list-row.css";

export function RowActions(props: { children: ReactNode; className?: string }) {
  return <div className={cn("row-actions row-action-buttons", props.className)}>{props.children}</div>;
}

export function ListRow(props: {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  meta?: ReactNode;
  status?: ReactNode;
  title?: ReactNode;
}) {
  return (
    <div className={cn("compact-list-row", Boolean(props.actions) && "compact-list-row-actions", props.className)}>
      {props.children ?? (
        <span>
          <strong>{props.title}</strong>
          {props.meta ? <small>{props.meta}</small> : null}
        </span>
      )}
      {props.status}
      {props.actions}
    </div>
  );
}
