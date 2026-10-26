import { Dialog } from "../../components/ui";
import { ServiceForm, options } from "./form";
import { newId, type ServiceEditorProps } from "./editor";
import type { ServiceCostLine } from "./types";
export type FinanceDialog = "price" | "tariff" | null;
export function FinanceDialogs({
  service,
  catalog,
  save,
  locked,
  mode,
  onClose,
}: ServiceEditorProps & { mode: FinanceDialog; onClose: () => void }) {
  return (
    <Dialog
      title={mode === "price" ? "Preis vereinbaren" : "Tarif übernehmen"}
      open={mode !== null}
      onClose={onClose}
    >
      {mode === "price" ? (
        <ServiceForm
          hideLegend
          title="Vereinbarter Preis"
          disabled={locked}
          fields={[
            {
              name: "agreedRevenue",
              label: "Vereinbarter Erlös (EUR)",
              type: "decimal",
            },
          ]}
          initial={{ agreedRevenue: service.agreedRevenue }}
          onSubmit={async (values) => {
            await save({
              agreedRevenue: values.agreedRevenue as string | null,
            });
            onClose();
          }}
        />
      ) : mode === "tariff" ? (
        <ServiceForm
          hideLegend
          title="Tarifposition"
          disabled={locked}
          submitLabel="Position hinzufügen"
          fields={[
            options(
              "tariffId",
              "Tarif",
              catalog.tariffs.filter((tariff) => tariff.active),
              true,
            ),
            {
              name: "plannedQuantity",
              label: "Menge Plan",
              type: "decimal",
              required: true,
            },
            { name: "actualQuantity", label: "Menge Ist", type: "decimal" },
          ]}
          onSubmit={async (values) => {
            const tariff = catalog.tariffs.find(
              (row) => row.id === values.tariffId,
            );
            if (!tariff) throw new Error("Tarif nicht gefunden.");
            const line: ServiceCostLine = {
              id: newId(),
              label: tariff.name,
              category: tariff.category,
              unit: tariff.unit,
              tariffId: tariff.id,
              plannedQuantity: String(values.plannedQuantity),
              actualQuantity: values.actualQuantity as string | null,
              costRate: tariff.costRate,
              saleRate: tariff.saleRate,
            };
            await save({ lines: [...service.lines, line] });
            onClose();
          }}
        />
      ) : null}
    </Dialog>
  );
}
