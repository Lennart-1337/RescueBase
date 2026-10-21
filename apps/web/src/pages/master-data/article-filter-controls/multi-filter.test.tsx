import { fireEvent, render, screen } from "@testing-library/react";
import { MultiFilter } from "./multi-filter";

it("keeps the menu open during a label's focus transfer and closes on outside pointer input", () => {
  const change = vi.fn();
  render(<MultiFilter label="Fehlende Angaben" emptyLabel="Keine Einschränkung" options={[{ label: "Artikel-Link fehlt", value: "articleUrl" }]} value={[]} onChange={change} />);
  const summary = screen.getByText("Keine Einschränkung").closest("summary")!;
  const details = summary.closest("details")!;
  details.open = true;
  summary.focus();
  fireEvent.blur(summary, { relatedTarget: null });
  expect(details).toHaveAttribute("open");
  fireEvent.click(screen.getByText("Artikel-Link fehlt"));
  expect(change).toHaveBeenCalledWith(["articleUrl"]);
  fireEvent.pointerDown(document.body);
  expect(details).not.toHaveAttribute("open");
});

it("closes when keyboard focus moves outside the filter", () => {
  render(<><MultiFilter label="Kategorie" emptyLabel="Alle Kategorien" options={[]} value={[]} onChange={vi.fn()} /><button>Weiter</button></>);
  const summary = screen.getByText("Alle Kategorien").closest("summary")!;
  const details = summary.closest("details")!;
  details.open = true;
  fireEvent.blur(summary, { relatedTarget: screen.getByRole("button", { name: "Weiter" }) });
  expect(details).not.toHaveAttribute("open");
});
