import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { SearchableSelect } from "./searchable-select";

describe("SearchableSelect", () => {
  it("filters options and commits the selected value", () => {
    render(<TestSelect />);
    const input = screen.getByLabelText("Standort");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Außen" } });
    fireEvent.mouseDown(screen.getByRole("option", { name: "Außenlager" }));

    expect(input).toHaveValue("Außenlager");
    expect(screen.getByTestId("selected-value")).toHaveTextContent("loc-alt");
  });

  it("shows all options when opened with a preselected value", () => {
    render(<TestSelect initialValue="loc-main" />);
    const input = screen.getByLabelText("Standort");

    expect(input).toHaveValue("Hauptlager");
    fireEvent.focus(input);

    expect(input).toHaveValue("");
    expect(screen.getByRole("option", { name: "Alle Standorte" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Hauptlager" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Außenlager" })).toBeInTheDocument();
  });

  it("filters and commits from a preselected value", () => {
    render(<TestSelect initialValue="loc-main" />);
    const input = screen.getByLabelText("Standort");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Außen" } });

    expect(screen.getByRole("option", { name: "Außenlager" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Hauptlager" })).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("option", { name: "Außenlager" }));

    expect(input).toHaveValue("Außenlager");
    expect(screen.getByTestId("selected-value")).toHaveTextContent("loc-alt");
  });

  it("exposes selected and open state classes for styling", () => {
    render(<TestSelect initialValue="loc-main" />);
    const input = screen.getByLabelText("Standort");
    const select = input.closest(".searchable-select");

    expect(select).toHaveClass("searchable-select-has-value");

    fireEvent.focus(input);

    expect(select).toHaveClass("searchable-select-open");
    expect(screen.getByRole("option", { name: "Hauptlager" }).querySelector("svg")).not.toBeNull();
  });

  it("renders the listbox in a portal with fixed positioning", () => {
    render(<div style={{ overflow: "hidden" }}><TestSelect /></div>);
    const input = screen.getByLabelText("Standort");
    const root = input.closest(".searchable-select-root") as HTMLDivElement;

    vi.spyOn(root, "getBoundingClientRect").mockReturnValue(rect({
      bottom: 146,
      height: 46,
      left: 40,
      right: 340,
      top: 100,
      width: 300
    }));

    fireEvent.focus(input);

    const listbox = screen.getByRole("listbox");
    expect(listbox.parentElement).toBe(document.body);
    expect(listbox).toHaveStyle({ left: "40px", top: "152px", width: "300px" });
  });

  it("flips upward when there is not enough room below", () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 480 });
    const scrollHeight = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(220);
    render(<TestSelect />);
    const input = screen.getByLabelText("Standort");
    const root = input.closest(".searchable-select-root") as HTMLDivElement;

    vi.spyOn(root, "getBoundingClientRect").mockReturnValue(rect({
      bottom: 466,
      height: 46,
      left: 40,
      right: 340,
      top: 420,
      width: 300
    }));

    fireEvent.focus(input);

    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveAttribute("data-placement", "top");
    expect(listbox).toHaveStyle({ top: "194px" });
    scrollHeight.mockRestore();
  });
});

function TestSelect(props: { initialValue?: string }) {
  const [value, setValue] = useState(props.initialValue ?? "");
  return (
    <>
      <label>
        Standort
        <SearchableSelect
          emptyLabel="Alle Standorte"
          onChange={setValue}
          options={[
            { label: "Alle Standorte", value: "" },
            { label: "Hauptlager", value: "loc-main" },
            { label: "Außenlager", value: "loc-alt" }
          ]}
          value={value}
        />
      </label>
      <output data-testid="selected-value">{value}</output>
    </>
  );
}

function rect(props: { bottom: number; height: number; left: number; right: number; top: number; width: number }) {
  return {
    ...props,
    x: props.left,
    y: props.top,
    toJSON: () => props
  } as DOMRect;
}
