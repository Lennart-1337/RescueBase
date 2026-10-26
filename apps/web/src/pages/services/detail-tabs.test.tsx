import { fireEvent, render, screen } from "@testing-library/react";
import { DetailTabs } from "./detail-tabs";
describe("service detail navigation", () => {
  it("supports arrow navigation and the first and last tab through the keyboard", () => {
    const onTab = vi.fn();
    render(<DetailTabs tab="overview" onTab={onTab} />);
    const overview = screen.getByRole("tab", { name: "Übersicht" });
    expect(overview).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(overview, { key: "ArrowRight" });
    expect(onTab).toHaveBeenLastCalledWith("need");
    expect(screen.getByRole("tab", { name: "Bedarf" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Bedarf" }), {
      key: "End",
    });
    expect(onTab).toHaveBeenLastCalledWith("finance");
    expect(screen.getByRole("tab", { name: "Kalkulation" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Kalkulation" }), {
      key: "Home",
    });
    expect(onTab).toHaveBeenLastCalledWith("overview");
    expect(overview).toHaveFocus();
  });
});
