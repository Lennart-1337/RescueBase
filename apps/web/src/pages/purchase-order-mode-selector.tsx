import { cn } from "../components/ui";

export type PurchaseOrderMode = "manual" | "shortages";

const items: Array<{ label: string; value: PurchaseOrderMode }> = [
  { label: "Manuell", value: "manual" },
  { label: "Aus Fehlmengen", value: "shortages" }
];

export function PurchaseOrderModeSelector(props: { onChange: (value: PurchaseOrderMode) => void; value: PurchaseOrderMode }) {
  return (
    <div aria-label="Erstellmodus" className="tab-list purchase-order-mode-selector" role="tablist">
      {items.map((item) => (
        <button
          aria-selected={item.value === props.value}
          className={cn("tab-button", item.value === props.value && "tab-button-active")}
          key={item.value}
          onClick={() => props.onChange(item.value)}
          role="tab"
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
