import { render, screen } from "@testing-library/react";
import { CheckGroups } from "./public-check-groups";

function show(articleShortName?: string) {
  render(<CheckGroups groupedPositions={[{ key: "m", title: "Verband", positions: [{
    id: "p", articleId: "a", articleName: "Verbandpäckchen mittel steril", articleShortName,
    unit: "Stück", requiredQuantity: 1, critical: false,
  }] }]} linesById={new Map()} onUpdateLine={vi.fn()} />);
}

it("uses the short name as the checklist heading and keeps the full name for identification", () => {
  show("  Verbandpäckchen M  ");
  expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(/^Verbandpäckchen M$/);
  expect(screen.getByText("Verbandpäckchen mittel steril")).toBeVisible();
});

it.each([undefined, "", "   ", "Verbandpäckchen mittel steril"])("falls back without duplicate text for %s", (name) => {
  show(name);
  expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Verbandpäckchen mittel steril");
  expect(screen.getAllByText("Verbandpäckchen mittel steril")).toHaveLength(1);
});
