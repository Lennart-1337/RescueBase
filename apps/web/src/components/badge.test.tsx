import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders a standardized badge with tone and size classes", () => {
    render(<Badge size="sm" tone="warning">Achtung</Badge>);

    const badge = screen.getByText("Achtung").closest(".badge");
    expect(badge).toHaveClass("badge", "badge-warning", "badge-sm");
    expect(screen.getByText("Achtung")).toHaveClass("badge-label");
  });
});
