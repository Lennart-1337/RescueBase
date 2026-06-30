import { cn } from "../components/ui";

type PurchaseOrderMode = "manual" | "shortages";

const items: Array<{ description: string; label: string; value: PurchaseOrderMode }> = [
  { description: "Freie Bestellung mit eigenen Positionen anlegen.", label: "Manuell", value: "manual" },
  { description: "Bedarf direkt aus offenen Fehlmengen übernehmen.", label: "Aus Fehlmengen", value: "shortages" }
];

export function PurchaseOrderModeSelector(props: { onChange: (value: PurchaseOrderMode) => void; value: PurchaseOrderMode }) {
  return (
    <div aria-label="Erstellmodus" className="purchase-order-mode-grid" role="group">
      {items.map((item) => (
        <button
          aria-pressed={item.value === props.value}
          className={cn("purchase-order-mode-card", item.value === props.value && "purchase-order-mode-card-active")}
          key={item.value}
          onClick={() => props.onChange(item.value)}
          type="button"
        >
          <strong>{item.label}</strong>
          <span>{item.description}</span>
        </button>
      ))}
    </div>
  );
}
