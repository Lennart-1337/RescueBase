import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MpgForm } from "./form";

describe("MPG forms", () => {
  it("submits typed numbers and excludes empty optional references", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<MpgForm title="Gerät erfassen" fields={[{ name: "name", label: "Name", required: true }, { name: "year", label: "Jahr", type: "number" }, { name: "personId", label: "Zuständig", options: [] }]} onSubmit={submit} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "AED" } });
    fireEvent.change(screen.getByLabelText("Jahr"), { target: { value: "2026" } });
    fireEvent.submit(screen.getByRole("form", { name: "Gerät erfassen" }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ name: "AED", year: 2026 }));
  });
  it("keeps input and reports a rejected save", async () => {
    render(<MpgForm title="Prüfung" fields={[{ name: "name", label: "Name" }]} onSubmit={async () => { throw new Error("Versionskonflikt"); }} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "STK" } });
    fireEvent.submit(screen.getByRole("form", { name: "Prüfung" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Versionskonflikt");
    expect(screen.getByLabelText("Name")).toHaveValue("STK");
  });
});

it("renders MPG boolean fields as the shared checkslider", () => {
  render(<MpgForm title="Prüfanforderung" fields={[{ name: "mandatory", label: "Pflichtprüfung", type: "checkbox" }]} initial={{ mandatory: true }} onSubmit={async () => undefined} />);
  expect(screen.getByRole("checkbox", { name: "Pflichtprüfung" }).closest(".checkbox-field")).not.toBeNull();
});
