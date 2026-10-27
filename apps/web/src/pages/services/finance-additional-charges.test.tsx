import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Finance } from "./finance";
import { catalogFixture, serviceFixture } from "./test-fixtures";

const charge = { id: "charge-1", label: "Fahrtkosten", amount: "12.50" };
const props = {
  service: { ...serviceFixture, additionalCharges: [] },
  catalog: catalogFixture,
  locked: false,
  save: vi.fn(async () => undefined),
};
afterEach(() => vi.clearAllMocks());

it("adds a named charge, previews it separately from material discount and saves it", async () => {
  render(<Finance {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Posten hinzufügen" }));
  fireEvent.change(screen.getByLabelText("Bezeichnung für Posten 1"), { target: { value: " Fahrtkosten " } });
  fireEvent.change(screen.getByLabelText("Betrag für Posten 1 (EUR)"), { target: { value: "12,50" } });
  expect(screen.getByText("Gesamt geplant").nextElementSibling).toHaveTextContent("47,50");
  fireEvent.click(screen.getByLabelText("Materialpauschale als Rabatt"));
  expect(screen.getByText("Gesamt geplant").nextElementSibling).toHaveTextContent("12,50");
  fireEvent.click(screen.getByRole("button", { name: "Kalkulation speichern" }));
  await waitFor(() => expect(props.save).toHaveBeenCalledWith(expect.objectContaining({
    additionalCharges: [{ id: expect.any(String), label: "Fahrtkosten", amount: "12.50" }],
    materialDiscounted: true,
  })));
});

it("edits existing charges and removes them without leaving the amount in the calculation", async () => {
  render(<Finance {...props} service={{ ...props.service, additionalCharges: [charge] }} />);
  fireEvent.change(screen.getByLabelText("Betrag für Posten 1 (EUR)"), { target: { value: "20" } });
  expect(screen.getByText("Gesamt geplant").nextElementSibling).toHaveTextContent("55,00");
  fireEvent.click(screen.getByRole("button", { name: "Kalkulation speichern" }));
  await waitFor(() => expect(props.save).toHaveBeenLastCalledWith(expect.objectContaining({
    additionalCharges: [{ ...charge, amount: "20" }],
  })));
  await waitFor(() => expect(screen.getByRole("button", { name: "Kalkulation speichern" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Posten entfernen: Fahrtkosten" }));
  expect(screen.queryByLabelText("Betrag für Posten 1 (EUR)")).toBeNull();
  expect(screen.getByText("Gesamt geplant").nextElementSibling).toHaveTextContent("35,00");
  fireEvent.click(screen.getByRole("button", { name: "Kalkulation speichern" }));
  await waitFor(() => expect(props.save).toHaveBeenCalledWith(expect.objectContaining({ additionalCharges: [] })));
});

it.each([
  { ...charge, label: " " }, { ...charge, amount: "-1" },
  { ...charge, amount: "1.001" }, { ...charge, amount: "" },
])("rejects invalid charges without sending a request: %s", async (invalid) => {
  render(<Finance {...props} service={{ ...props.service, additionalCharges: [invalid] }} />);
  expect(screen.getByText("Gesamt geplant").nextElementSibling).toHaveTextContent("–");
  fireEvent.submit(screen.getByRole("form", { name: "Kalkulation" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Posten");
  expect(props.save).not.toHaveBeenCalled();
});

it("locks adding, editing and removing charges on completed services", () => {
  render(<Finance {...props} locked service={{ ...props.service, additionalCharges: [charge] }} />);
  expect(screen.getByRole("button", { name: "Posten hinzufügen" })).toBeDisabled();
  expect(screen.getByLabelText("Bezeichnung für Posten 1")).toBeDisabled();
  expect(screen.getByLabelText("Betrag für Posten 1 (EUR)")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Posten entfernen: Fahrtkosten" })).toBeDisabled();
});
