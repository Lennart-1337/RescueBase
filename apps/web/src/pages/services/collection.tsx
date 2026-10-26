import { useState, type ReactNode } from "react";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { Button, Dialog } from "../../components/ui";
import { ServiceForm, type ServiceField, type Values } from "./form";
import { ServiceTable } from "./table";
import { newId } from "./editor";
export function ServiceCollection<T extends { id: string }>({
  title,
  rows,
  columns,
  fields,
  defaults,
  build,
  onChange,
  locked,
  createLabel = "Hinzufügen",
  headerActions,
}: {
  title: string;
  rows: T[];
  columns: DataTableColumn<T>[];
  fields: ServiceField[];
  defaults: Values;
  build: (values: Values, previous?: T) => T;
  onChange: (rows: T[]) => Promise<unknown>;
  locked: boolean;
  createLabel?: string;
  headerActions?: ReactNode;
}) {
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const selected = editing && editing !== "new" ? editing : undefined;
  return (
    <section className="service-section">
      <header className="service-section-header">
        <h2>{title}</h2>
        <div className="service-actions">
          {headerActions}
          <Button disabled={locked} onClick={() => setEditing("new")}>
            {createLabel}
          </Button>
        </div>
      </header>
      <ServiceTable
        rows={rows}
        columns={[
          ...columns,
          {
            id: "actions",
            label: "Aktionen",
            render: (row) => (
              <Button
                variant="ghost"
                onClick={() => {
                  setError("");
                  setEditing(row);
                }}
              >
                {locked ? "Ansehen" : "Bearbeiten"}
              </Button>
            ),
          },
        ]}
      />
      <Dialog
        title={selected ? `${title}: bearbeiten` : `${title}: hinzufügen`}
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="wide"
      >
        {editing ? (
          <ServiceForm
            key={selected?.id ?? "new"}
            title={title}
            hideLegend
            fields={fields}
            initial={selected ? (selected as Values) : defaults}
            disabled={locked}
            onSubmit={async (values) => {
              const row = {
                ...build(values, selected),
                id: selected?.id ?? newId(),
              };
              await onChange(
                selected
                  ? rows.map((previous) =>
                      previous.id === row.id ? row : previous,
                    )
                  : [...rows, row],
              );
              setEditing(null);
            }}
          />
        ) : null}
        {selected && !locked ? (
          <div className="service-remove">
            <Button
              variant="danger"
              loading={removing}
              onClick={async () => {
                if (!window.confirm("Diesen Eintrag wirklich entfernen?"))
                  return;
                setRemoving(true);
                setError("");
                try {
                  await onChange(rows.filter((row) => row.id !== selected.id));
                  setEditing(null);
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Entfernen fehlgeschlagen.",
                  );
                } finally {
                  setRemoving(false);
                }
              }}
            >
              Eintrag entfernen
            </Button>
            {error ? <p role="alert">{error}</p> : null}
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}
