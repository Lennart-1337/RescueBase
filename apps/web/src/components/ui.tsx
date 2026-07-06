import {
  useId,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactNode
} from "react";
import { LoaderCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { fadeVariants, scaleFadeVariants } from "../motion/presets";
import { useMotionMode } from "../motion/use-motion-mode";
export { CheckboxField } from "./checkbox-field";
import "./ui.css";
export { Badge } from "./badge";

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function Button({
  children,
  className,
  disabled,
  loading = false,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      aria-busy={loading}
      className={cn("button", `button-${variant}`, loading && "button-loading", className)}
      data-loading={loading || undefined}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden="true" className="button-loading-icon" /> : null}
      {children}
    </button>
  );
}

export function AnchorButton({
  className,
  variant = "primary",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <a className={cn("button", `button-${variant}`, className)} {...props} />;
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("panel", className)} {...props} />;
}

export function Field({ label, children, className }: PropsWithChildren<{ className?: string; label: string }>) {
  return (
    <label className={cn("field", className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Tabs({
  items,
  label,
  onChange,
  value
}: {
  items: Array<{ label: string; value: string }>;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div aria-label={label} className="tab-list" role="tablist">
      {items.map((item) => (
        <button
          aria-selected={item.value === value}
          className={cn("tab-button", item.value === value && "tab-button-active")}
          key={item.value}
          onClick={() => onChange(item.value)}
          role="tab"
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Dialog({
  actions,
  bodyClassName,
  className,
  children,
  description,
  onClose,
  open,
  size = "default",
  title
}: PropsWithChildren<{
  actions?: ReactNode;
  bodyClassName?: string;
  className?: string;
  description?: string;
  onClose: () => void;
  open: boolean;
  size?: "default" | "wide";
  title: string;
}>) {
  const titleId = useId();
  const descriptionId = useId();
  const motionMode = useMotionMode();

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          animate="visible"
          className="modal-backdrop"
          data-motion-mode={motionMode}
          data-motion-preset="fade"
          exit="exit"
          initial="hidden"
          onClick={onClose}
          variants={fadeVariants(motionMode)}
        >
          <motion.div
            animate="visible"
            aria-describedby={description ? descriptionId : undefined}
            aria-labelledby={titleId}
            aria-modal="true"
            className={cn("modal-dialog", size === "wide" && "modal-dialog-wide", className)}
            data-motion-mode={motionMode}
            data-motion-preset="panel-enter"
            exit="exit"
            initial="hidden"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            variants={scaleFadeVariants(motionMode)}
          >
            <div className="modal-header">
              <div className="modal-heading">
                <h2 id={titleId}>{title}</h2>
                {description ? <p id={descriptionId}>{description}</p> : null}
              </div>
              <Button
                aria-label="Dialog schließen"
                className="modal-close-button"
                onClick={onClose}
                type="button"
                variant="ghost"
              >
                ×
              </Button>
            </div>
            <div className={cn("modal-body", bodyClassName)}>{children}</div>
            {actions ? <div className="modal-footer">{actions}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
