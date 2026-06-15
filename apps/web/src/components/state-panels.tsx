import type { ReactNode } from "react";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { Button, Panel } from "./ui";

export function Metric(props: { icon: ReactNode; label: string; tone: "ready" | "warning" | "danger" | "info"; value: string }) {
  return (
    <Panel className="metric">
      <div className={`metric-icon ${props.tone}`}>{props.icon}</div>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </Panel>
  );
}

export function LoadingPanel({ label }: { label: string }) {
  return (
    <Panel className="state-panel">
      <h1>{label}</h1>
    </Panel>
  );
}

export function ErrorPanel({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Panel className="state-panel error-state">
      <AlertTriangle />
      <h1>API nicht verfügbar</h1>
      <p>{error.message}</p>
      <Button onClick={onRetry} type="button">
        Erneut versuchen
      </Button>
    </Panel>
  );
}

export function InlineError({ error }: { error: Error }) {
  return (
    <div className="inline-error" role="alert">
      <AlertTriangle />
      <span>{error.message}</span>
    </div>
  );
}

export function EmptyState({ text, title }: { text: string; title: string }) {
  return (
    <div className="empty-state">
      <ClipboardList />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
