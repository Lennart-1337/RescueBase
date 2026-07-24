import { render, screen } from "@testing-library/react";
import { LoadingPanel } from "./state-panels";

describe("LoadingPanel", () => {
  it("announces loading and renders a visual skeleton", () => {
    render(<LoadingPanel label="Lagerbestand wird geladen" />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Lagerbestand wird geladen")).toBeInTheDocument();
    expect(document.querySelectorAll(".loading-skeleton-line")).toHaveLength(3);
  });
});
