import { render, screen } from "@testing-library/react";
import { ClipboardList } from "lucide-react";
import { ListRow, RowActions } from "./list-row";
import { PanelHeader } from "./panel-header";
import { MetricGrid } from "./state-panels";
import { StatusBadge, statusLabel, statusTone } from "./status-badge";

describe("shared layout primitives", () => {
  it("renders a panel header with optional actions", () => {
    render(<PanelHeader actions={<button type="button">Aktion</button>} description="Beschreibung" title="Titel" />);

    expect(screen.getByRole("heading", { name: "Titel" })).toBeInTheDocument();
    expect(screen.getByText("Beschreibung")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aktion" })).toBeInTheDocument();
  });

  it("keeps compact list row classes for existing layouts", () => {
    render(<ListRow actions={<RowActions><button type="button">Öffnen</button></RowActions>} meta="Detail" title="Eintrag" />);

    expect(screen.getByText("Eintrag").closest(".compact-list-row-actions")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Öffnen" }).closest(".row-action-buttons")).not.toBeNull();
  });

  it("renders metric grids with existing grid classes", () => {
    render(<MetricGrid compact items={[{ icon: <ClipboardList />, label: "Aktiv", tone: "info", value: "2" }]} label="Kennzahlen" />);

    expect(screen.getByRole("region", { name: "Kennzahlen" })).toHaveClass("metric-grid-compact");
    expect(screen.getByText("Aktiv")).toBeInTheDocument();
  });

  it("maps domain statuses to labels and tones", () => {
    expect(statusLabel("purchaseOrder", "DRAFT")).toBe("Entwurf");
    expect(statusTone("purchaseOrder", "RECEIVED")).toBe("ready");

    render(<StatusBadge kind="kit" status="CONDITIONAL" />);
    expect(screen.getByText("Bedingt einsatzbereit").closest(".badge")).toHaveClass("badge-warning");
  });
});
