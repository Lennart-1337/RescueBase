import type { PropsWithChildren } from "react";
import { Badge, Button, cn } from "./ui";

export function ListFilterBar({
  children,
  countLabel,
  fieldsClassName = "form-grid-four",
  onReset
}: PropsWithChildren<{ countLabel: string; fieldsClassName?: string; onReset: () => void }>) {
  return (
    <>
      <div className={cn("form-grid", fieldsClassName, "filter-bar")}>{children}</div>
      <div className="form-actions split-actions filter-bar-actions">
        <Badge tone="info">{countLabel}</Badge>
        <Button onClick={onReset} type="button" variant="ghost">Filter zurücksetzen</Button>
      </div>
    </>
  );
}
