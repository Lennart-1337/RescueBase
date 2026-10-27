import { fireEvent, render, screen } from "@testing-library/react";
import { ListFilters } from "./list-filters";
it("accepts German date filters and sends canonical calendar dates", () => {
  const onApply = vi.fn();
  render(<ListFilters onApply={onApply} />);
  fireEvent.click(screen.getByRole("button", { name: "Weitere Filter" }));
  fireEvent.change(screen.getByLabelText("Von"), { target: { value: "01.11.2026" } });
  fireEvent.submit(screen.getByRole("search", { name: "Dienste filtern" }));
  expect(onApply).toHaveBeenCalledWith(expect.stringContaining("from=2026-11-01"));
});

it("starts with search and status and reveals less frequent filters on demand", () => {
  const onApply = vi.fn();
  render(<ListFilters onApply={onApply} />);
  expect(
    screen.getByRole("searchbox", { name: "Dienste suchen" }),
  ).toBeVisible();
  expect(screen.queryByLabelText("Auftraggeber")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Weitere Filter" }));
  fireEvent.change(screen.getByLabelText("Auftraggeber"), {
    target: { value: "Sportverein" },
  });
  fireEvent.submit(screen.getByRole("search", { name: "Dienste filtern" }));
  expect(onApply).toHaveBeenCalledWith(
    expect.stringContaining("customer=Sportverein"),
  );
});

it("preserves applied filter values when the filter controls are collapsed", () => {
  const onApply = vi.fn();
  render(<ListFilters onApply={onApply} />);
  fireEvent.click(screen.getByRole("button", { name: "Weitere Filter" }));
  fireEvent.change(screen.getByLabelText("Auftraggeber"), {
    target: { value: "DLRG" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Weitere Filter" }));
  fireEvent.submit(screen.getByRole("search", { name: "Dienste filtern" }));
  expect(onApply).toHaveBeenCalledWith(
    expect.stringContaining("customer=DLRG"),
  );
});
