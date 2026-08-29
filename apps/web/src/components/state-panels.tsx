import type { ReactNode } from "react";
import { motion } from "motion/react";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { fadeVariants, listItemVariants } from "../motion/presets";
import { AnimatedStateSection } from "../motion/animated-containers";
import { useMotionMode } from "../motion/use-motion-mode";
import { Button, Panel } from "./ui";
import "./metric-grid.css";
import "./state-panels.css";

export function Metric(props: { icon: ReactNode; label: string; tone: "ready" | "warning" | "danger" | "info"; value: string }) {
  return (
    <Panel className="metric">
      <div className={`metric-icon ${props.tone}`}>{props.icon}</div>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </Panel>
  );
}

export function MetricGrid(props: {
  compact?: boolean;
  items: Array<Parameters<typeof Metric>[0]>;
  label: string;
}) {
  return (
    <section className={`metric-grid${props.compact ? " metric-grid-compact" : ""}`} aria-label={props.label}>
      {props.items.map((item) => <Metric key={item.label} {...item} />)}
    </section>
  );
}

export function LoadingPanel({ label }: { label: string }) {
  return (
    <AnimatedStateSection aria-busy="true" className="panel state-panel loading-state" role="status">
      <div aria-hidden="true" className="loading-skeleton">
        <span className="loading-skeleton-line loading-skeleton-title" />
        <span className="loading-skeleton-line" />
        <span className="loading-skeleton-line loading-skeleton-short" />
      </div>
      <h1>{label}</h1>
    </AnimatedStateSection>
  );
}

export function ErrorPanel({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <AnimatedStateSection className="panel state-panel error-state">
      <AlertTriangle />
      <h1>API nicht verfügbar</h1>
      <p>{error.message}</p>
      <Button onClick={onRetry} type="button">
        Erneut versuchen
      </Button>
    </AnimatedStateSection>
  );
}

export function InlineError({ error }: { error: Error }) {
  const motionMode = useMotionMode();

  return (
    <motion.div
      animate="visible"
      className="inline-error"
      data-motion-mode={motionMode}
      data-motion-preset="fade"
      initial="hidden"
      role="alert"
      variants={fadeVariants(motionMode)}
    >
      <AlertTriangle />
      <span>{error.message}</span>
    </motion.div>
  );
}

export function EmptyState({ text, title }: { text: string; title: string }) {
  const motionMode = useMotionMode();

  return (
    <motion.div
      animate="visible"
      className="empty-state"
      data-motion-mode={motionMode}
      data-motion-preset="list-item-update"
      initial="hidden"
      variants={listItemVariants(motionMode)}
    >
      <ClipboardList />
      <h2>{title}</h2>
      <p>{text}</p>
    </motion.div>
  );
}
