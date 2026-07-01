import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "./ui";
import "./page-layout.css";

export function PageHeader(props: { actions?: ReactNode; className?: string; description?: string; title: string }) {
  return (
    <header className={cn("topbar page-header", props.className)}>
      <div><h1>{props.title}</h1>{props.description ? <p>{props.description}</p> : null}</div>
      {props.actions ? <div className="topbar-actions">{props.actions}</div> : null}
    </header>
  );
}

export function PageToolbar({ children, label }: PropsWithChildren<{ label: string }>) {
  return <section aria-label={label} className="panel page-toolbar" role="search">{children}</section>;
}

export function Workspace({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("page-workspace", className)}>{children}</div>;
}

export function WorkspaceMain({ children, label }: PropsWithChildren<{ label: string }>) {
  return <section aria-label={label} className="workspace-main">{children}</section>;
}

export function WorkspaceRail({ children, className, label }: PropsWithChildren<{ className?: string; label: string }>) {
  return <aside aria-label={label} className={cn("workspace-rail", className)}>{children}</aside>;
}

export function PageSection(props: PropsWithChildren<{ description?: string; title: string }>) {
  return (
    <section className="page-section">
      <header className="section-header"><h2>{props.title}</h2>{props.description ? <p>{props.description}</p> : null}</header>
      {props.children}
    </section>
  );
}
