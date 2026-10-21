import { fireEvent, render, screen } from "@testing-library/react";
import { ArticleFilters } from "../article-filters";
import type { ArticlePanelProps } from "../article-panel-types";

function setup(patch = {}) {
  const onFilterChange = vi.fn();
  const props = {
    articles: [], allArticles: [{ category: "Verband", manufacturer: "Hersteller A", unit: "Stück" }],
    suppliers: [{ id: "supplier-a", name: "Lieferant A" }], totalCount: 1,
    filters: { q: "", category: "", medicalDevice: "", stkRequired: "", mtkRequired: "", criticalDefault: "", ...patch },
    onFilterChange, onResetFilters: vi.fn(),
  } as unknown as ArticlePanelProps;
  render(<ArticleFilters {...props} />);
  return onFilterChange;
}

describe("article filter controls", () => {
  it("offers stable options from all articles and supports multiple manufacturers", () => {
    const change = setup({ manufacturer: ["Hersteller B"] });
    fireEvent.click(screen.getByText("1 ausgewählt"));
    fireEvent.click(screen.getByLabelText("Hersteller A"));
    expect(change).toHaveBeenCalledWith({ manufacturer: ["Hersteller B", "Hersteller A"] });
  });

  it("offers unassigned suppliers", () => {
    const change = setup();
    fireEvent.click(screen.getByText("Alle Lieferanten"));
    fireEvent.click(screen.getByLabelText("Ohne Zuordnung"));
    expect(change).toHaveBeenCalledWith({ supplier: ["__none__"] });
  });

  it("supports negative flags and explicit price basis", () => {
    const change = setup();
    fireEvent.click(screen.getByText("Weitere Filter"));
    fireEvent.change(screen.getByLabelText("STK"), { target: { value: "no" } });
    expect(change).toHaveBeenCalledWith({ stkRequired: false });
    fireEvent.change(screen.getByLabelText("Preisbezug"), { target: { value: "package" } });
    expect(change).toHaveBeenCalledWith({ priceBasis: "package" });
  });

  it("selects multiple missing fields and clears incompatible package bounds", () => {
    const change = setup({ packageMin: "5", packageMax: "20" });
    fireEvent.click(screen.getByText("Weitere Filter"));
    fireEvent.click(screen.getByText("Keine Einschränkung"));
    fireEvent.click(screen.getByLabelText("Barcode fehlt"));
    expect(change).toHaveBeenCalledWith({ missing: ["barcode"] });
    fireEvent.click(screen.getByLabelText("Verpackungsgröße nicht hinterlegt"));
    expect(change).toHaveBeenCalledWith({ packageMissing: true, packageMin: "", packageMax: "" });
  });

  it("disables package ranges when the size is missing", () => {
    setup({ packageMissing: true });
    fireEvent.click(screen.getByText("Weitere Filter"));
    expect(screen.getByLabelText("Packungsgröße ab")).toBeDisabled();
    expect(screen.getByLabelText("Packungsgröße bis")).toBeDisabled();
  });

  it("shows decimal comma ranges restored from links", () => {
    const change = setup({ priceMin: "1,20" });
    fireEvent.click(screen.getByText("Weitere Filter"));
    expect(screen.getByLabelText("Preis ab (€)")).toHaveValue("1,20");
    fireEvent.change(screen.getByLabelText("Preis ab (€)"), { target: { value: "1,2" } });
    expect(change).toHaveBeenCalledWith({ priceMin: "1,2" });
  });
  it("keeps advanced active filters removable while collapsed", () => {
    const change = setup({ sterile: false, priceMin: "0" });
    fireEvent.click(screen.getByRole("button", { name: "Sterilität: Nicht steril entfernen" }));
    expect(change).toHaveBeenCalledWith({ sterile: "" });
    fireEvent.click(screen.getByRole("button", { name: /Preis ab: 0 €/ }));
    expect(change).toHaveBeenCalledWith({ priceMin: "" });
  });
});
