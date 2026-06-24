import type { PropsWithChildren, ReactNode } from "react";
import { Button, Panel, cn } from "../../components/ui";

export function SettingsPanel(props: PropsWithChildren<{
  description?: string;
  isSaving: boolean;
  onSave: () => void;
  title: string;
  extraAction?: ReactNode;
  className?: string;
}>) {
  return (
    <Panel aria-label={props.title} className={cn("settings-panel", props.className)}>
      <div className="panel-header">
        <div><h2>{props.title}</h2>{props.description ? <p>{props.description}</p> : null}</div>
        <div className="topbar-actions">
          {props.extraAction}
          <Button disabled={props.isSaving} onClick={props.onSave} type="button">Speichern</Button>
        </div>
      </div>
      {props.children}
    </Panel>
  );
}
