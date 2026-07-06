import type { InputHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";
import "./checkbox-field.css";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type CheckboxFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  className?: string;
  compact?: boolean;
  description?: ReactNode;
  emphasis?: "default" | "strong";
  label: ReactNode;
  layout?: "inline" | "split";
  variant?: "default" | "card";
};

export function CheckboxField({
  checked,
  className,
  compact = false,
  defaultChecked,
  description,
  disabled,
  emphasis = "default",
  label,
  layout = "inline",
  variant = "default",
  ...props
}: CheckboxFieldProps) {
  const isSelected = Boolean(checked ?? defaultChecked);

  return (
    <label
      className={cn(
        "checkbox-field",
        "check-field",
        compact && "checkbox-field-compact",
        compact && "check-field-compact",
        layout === "split" && "checkbox-field-split",
        variant === "card" && "checkbox-field-card",
        emphasis === "strong" && "checkbox-field-strong",
        isSelected && "checkbox-field-selected",
        disabled && "checkbox-field-disabled",
        className,
      )}
    >
      <span className="checkbox-control">
        <input
          checked={checked}
          className="checkbox-input"
          defaultChecked={defaultChecked}
          disabled={disabled}
          type="checkbox"
          {...props}
        />
        <span aria-hidden="true" className="checkbox-indicator">
          <Check />
        </span>
      </span>
      <span className="checkbox-copy">
        <span className="checkbox-label">{label}</span>
        {description ? (
          <span className="checkbox-description">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
