import {
  useId,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactNode
} from "react";
export { Badge } from "./badge";

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={cn("button", `button-${variant}`, className)} {...props} />;
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

export function Field({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <label className="field">
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

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn("modal-dialog", size === "wide" && "modal-dialog-wide", className)}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
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
      </div>
    </div>
  );
}
