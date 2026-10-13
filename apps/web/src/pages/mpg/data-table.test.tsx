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

  it("gives wide tables enough horizontal space for their columns", () => {
    const columns = Array.from({ length: 7 }, (_, index) => ({ id: `column-${index}`, label: `Spalte ${index}`, render: () => "Wert" }));
    const { container } = render(<MpgDataTable columns={columns} getRowId={(row: { id: string }) => row.id} rows={[{ id: "1" }]} />);

    expect(container.querySelector(".mpg-table-frame")).toHaveStyle({ "--mpg-table-min-width": "1190px" });
  });
});
