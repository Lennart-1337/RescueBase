import { text, type ServiceField } from "./form";
import { categoryLabels } from "./types";
export const lineFields: ServiceField[] = [
  text("label", "Leistung", true),
  {
    name: "category",
    label: "Kategorie",
    required: true,
    options: Object.entries(categoryLabels).map(([value, label]) => ({
      value,
      label,
    })),
  },
  text("unit", "Einheit", true),
  {
    name: "plannedQuantity",
    label: "Menge Plan",
    type: "decimal",
    required: true,
  },
  { name: "actualQuantity", label: "Menge Ist", type: "decimal" },
  {
    name: "costRate",
    label: "Kostensatz (EUR)",
    type: "decimal",
    required: true,
  },
  {
    name: "saleRate",
    label: "Verkaufssatz (EUR)",
    type: "decimal",
    required: true,
  },
];
