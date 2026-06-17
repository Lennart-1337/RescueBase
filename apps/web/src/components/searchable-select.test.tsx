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
});

function TestSelect() {
  const [value, setValue] = useState("");
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
