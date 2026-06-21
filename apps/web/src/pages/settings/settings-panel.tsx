import type { PropsWithChildren, ReactNode } from "react";
import { Button, Panel } from "../../components/ui";

export function SettingsPanel(props: PropsWithChildren<{
  description: string;
  isSaving: boolean;
  onSave: () => void;
  title: string;
  extraAction?: ReactNode;
}>) {
  return (
    <Panel aria-label={props.title}>
      <div className="panel-header">
        <div><h2>{props.title}</h2><p>{props.description}</p></div>
        <div className="topbar-actions">
          {props.extraAction}
          <Button disabled={props.isSaving} onClick={props.onSave} type="button">Speichern</Button>
        </div>
      </div>
      {props.children}
    </Panel>
  );
}
