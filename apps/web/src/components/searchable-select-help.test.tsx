import { fireEvent, render, screen } from "@testing-library/react";
import { SearchableSelect } from "./searchable-select";

const label = "Beatmungsbeutel für Erwachsene mit Reservoir und Sauerstoffanschluss";
function renderSelect(showSelectedHelp = true) {
  return render(<SearchableSelect ariaLabel="Artikel" onChange={() => {}} options={[{ label, value: "bag" }]} value="bag" showSelectedHelp={showSelectedHelp} />);
}

describe("SearchableSelect selected help", () => {
  it("shows the complete selected name on hover outside clipping containers", () => {
    renderSelect();
    const input = screen.getByRole("combobox");
    fireEvent.mouseEnter(input.closest(".searchable-select-root")!);
    const help = screen.getByRole("tooltip");
    expect(help).toHaveTextContent(label);
    expect(help.parentElement).toBe(document.body);
    expect(input).toHaveAttribute("aria-describedby", help.id);
    fireEvent.mouseLeave(input.closest(".searchable-select-root")!);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("supports keyboard focus and Escape dismissal", () => {
    renderSelect();
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    expect(screen.getByRole("tooltip")).toHaveTextContent(label);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-describedby");
    fireEvent.blur(input);
    fireEvent.focus(input);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("does not add help unless opted in", () => {
    renderSelect(false);
    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
