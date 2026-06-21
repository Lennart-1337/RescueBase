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
