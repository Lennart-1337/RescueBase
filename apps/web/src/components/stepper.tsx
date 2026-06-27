import { Minus, Plus } from "lucide-react";
import "./stepper.css";

export function Stepper({
  label,
  max,
  onChange,
  value
}: {
  label: string;
  max?: number;
  onChange: (value: number) => void;
  value: number;
}) {
  const upperLimit = max ?? 999;

  return (
    <div className="stepper" aria-label={label}>
      <span>{label}</span>
      <div>
        <button aria-label={`${label} verringern`} onClick={() => onChange(Math.max(0, value - 1))} type="button">
          <Minus />
        </button>
        <strong>{value}</strong>
        <button aria-label={`${label} erhöhen`} onClick={() => onChange(Math.min(upperLimit, value + 1))} type="button">
          <Plus />
        </button>
      </div>
    </div>
  );
}
