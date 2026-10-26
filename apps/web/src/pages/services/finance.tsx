import { useState } from "react";
import { Button } from "../../components/ui";
import { ServiceCollection } from "./collection";
import type { ServiceEditorProps } from "./editor";
import { formatMinutes, rateMoney } from "./time";
import { categoryLabels, type ServiceCostLine } from "./types";
import { lineFields } from "./finance-fields";
import { FinanceSummary } from "./finance-summary";
import { FinanceDialogs, type FinanceDialog } from "./finance-dialogs";
import "./service-tools.css";
export function Finance(props: ServiceEditorProps) {
  const { service, save, locked } = props;
  const [dialog, setDialog] = useState<FinanceDialog>(null);
  const plannedMinutes = service.assignments.reduce(
    (sum, row) =>
      sum +
      (Date.parse(row.endsAt) - Date.parse(row.startsAt)) / 60000 -
      row.breakMinutes,
    0,
  );
  return (
    <div className="service-stack">
      <header className="service-section-header">
        <h2>Kalkulation</h2>
        <span className="service-tool-meta">
          Personalzeit {formatMinutes(plannedMinutes)} · EUR
        </span>
      </header>
      <FinanceSummary costs={service.costs} />
      <ServiceCollection<ServiceCostLine>
        title="Positionen"
        createLabel="Position hinzufügen"
        rows={service.lines}
        fields={lineFields}
        defaults={{}}
        locked={locked}
        headerActions={
          <>
            <Button
              variant="ghost"
              disabled={locked}
              onClick={() => setDialog("price")}
            >
              Preis vereinbaren
            </Button>
            <Button
              variant="secondary"
              disabled={
                locked || !props.catalog.tariffs.some((tariff) => tariff.active)
              }
              onClick={() => setDialog("tariff")}
            >
              Tarif übernehmen
            </Button>
          </>
        }
        build={(values, previous) =>
          ({
            ...previous,
            ...values,
            id: previous?.id ?? "",
            tariffId: previous?.tariffId ?? null,
          }) as ServiceCostLine
        }
        onChange={(lines) => save({ lines })}
        columns={[
          {
            id: "label",
            label: "Leistung",
            render: (row) => (
              <>
                <strong>{row.label}</strong>
                <small>
                  {categoryLabels[row.category]}
                  {row.tariffId ? " · Tarifstand" : ""}
                </small>
              </>
            ),
            sortValue: (row) => row.label,
          },
          {
            id: "quantity",
            label: "Menge Plan / Ist",
            render: (row) =>
              `${row.plannedQuantity} / ${row.actualQuantity ?? "offen"} ${row.unit}`,
          },
          {
            id: "cost",
            label: "Kostensatz",
            render: (row) => rateMoney(row.costRate),
          },
          {
            id: "sale",
            label: "Verkaufssatz",
            render: (row) => rateMoney(row.saleRate),
          },
        ]}
      />
      <section className="service-section service-tool-documents">
        <h3>Dokumente</h3>
        <span className="service-tool-meta">Vorlagen ausstehend</span>
        <div className="service-actions">
          <Button disabled variant="secondary">
            Angebot erstellen
          </Button>
          <Button disabled variant="secondary">
            Rechnung erstellen
          </Button>
        </div>
      </section>
      <FinanceDialogs
        {...props}
        mode={dialog}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
