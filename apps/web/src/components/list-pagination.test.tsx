import { fireEvent, render, screen } from "@testing-library/react";
import { ListPagination } from "./list-pagination";

describe("ListPagination", () => {
  it("renders range, first/previous/next/last controls and page size options", () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <ListPagination
        label="Seitennavigation"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        page={3}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        total={73}
      />
    );

    expect(screen.getByText("21-30 von 73")).toBeInTheDocument();
    expect(screen.getByText("Seite 3 von 8")).toBeInTheDocument();
    expect(screen.getByLabelText("Einträge pro Seite")).toHaveValue("10");

    fireEvent.click(screen.getByRole("button", { name: "Erste Seite" }));
    fireEvent.click(screen.getByRole("button", { name: "Vorherige Seite" }));
    fireEvent.click(screen.getByRole("button", { name: "Nächste Seite" }));
    fireEvent.click(screen.getByRole("button", { name: "Letzte Seite" }));
    fireEvent.change(screen.getByLabelText("Einträge pro Seite"), { target: { value: "25" } });

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 2);
    expect(onPageChange).toHaveBeenNthCalledWith(3, 4);
    expect(onPageChange).toHaveBeenNthCalledWith(4, 8);
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it("hides page size control when the caller does not support changing it", () => {
    render(<ListPagination label="Seitennavigation" onPageChange={() => undefined} page={2} pageSize={25} total={60} />);

    expect(screen.getByText("26-50 von 60")).toBeInTheDocument();
    expect(screen.queryByLabelText("Einträge pro Seite")).toBeNull();
  });
});
