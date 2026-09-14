import { fireEvent, render, screen, within } from "@testing-library/react";
import { MpgDataTable } from "./data-table";

const rows = [{ id: "2", name: "Thermometer" }, { id: "1", name: "AED" }];

describe("MpgDataTable", () => {
  it("uses the shared sortable table without selection controls", () => {
    render(<MpgDataTable columns={[{ id: "name", label: "Gerät", render: (row) => row.name, sortValue: (row) => row.name }]} emptyMessage="Keine Geräte gefunden." getRowId={(row) => row.id} rows={rows} />);

    expect(screen.queryByRole("checkbox", { name: /auswählen/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerät sortieren" }));
    const renderedRows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(renderedRows.map((row) => row.textContent)).toEqual(["AED", "Thermometer"]);
  });

  it("shows the MPG empty state inside the table area", () => {
    render(<MpgDataTable columns={[{ id: "name", label: "Gerät", render: (row: { id: string; name: string }) => row.name }]} emptyMessage="Keine Geräte gefunden." getRowId={(row) => row.id} rows={[]} />);
    expect(screen.getByText("Keine Geräte gefunden.")).toBeInTheDocument();
  });
});
