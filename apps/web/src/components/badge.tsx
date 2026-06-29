import type { HTMLAttributes, PropsWithChildren } from "react";
import "./badge.css";

export type BadgeTone = "neutral" | "ready" | "warning" | "danger" | "info";
export type BadgeSize = "sm" | "md";

function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function Badge({
  children,
  className,
  size = "md",
  tone = "neutral",
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLSpanElement> & { size?: BadgeSize; tone?: BadgeTone }>) {
  return (
    <span className={cn("badge", `badge-${tone}`, `badge-${size}`, className)} {...props}>
      <span className="badge-label">{children}</span>
    </span>
  );
}
