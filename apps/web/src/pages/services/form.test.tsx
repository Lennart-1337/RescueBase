import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ServiceForm, datetime } from "./form";
describe("service time entry", () => {
  it("asks for the repeated autumn hour only when needed and preserves wintertime", async () => {
    const save = vi.fn().mockResolvedValue({});
    render(
      <ServiceForm
        title="Zeit erfassen"
        fields={[datetime("startsAt", "Beginn", true)]}
        initial={{ startsAt: "2026-10-25T01:30:00.000Z" }}
        onSubmit={save}
      />,
    );
    expect(screen.getByLabelText("Beginn: Zeitumstellung")).toHaveValue(
      "LATER",
    );
    fireEvent.submit(screen.getByRole("form", { name: "Zeit erfassen" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        startsAt: "2026-10-25T01:30:00.000Z",
      }),
    );
  });
  it("does not silently choose a fold after the user changes the wall time", async () => {
    const save = vi.fn().mockResolvedValue({});
    render(
      <ServiceForm
        title="Zeit erfassen"
        fields={[datetime("startsAt", "Beginn", true)]}
        onSubmit={save}
      />,
    );
    fireEvent.change(screen.getByLabelText("Beginn"), {
      target: { value: "2026-10-25T02:30" },
    });
    expect(screen.getByLabelText("Beginn: Zeitumstellung")).toBeRequired();
    fireEvent.submit(screen.getByRole("form", { name: "Zeit erfassen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("zweimal");
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Beginn: Zeitumstellung"), {
      target: { value: "EARLIER" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Zeit erfassen" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        startsAt: "2026-10-25T00:30:00.000Z",
      }),
    );
  });
  it("keeps decimal strings exact and allows clearing optional values", async () => {
    const save = vi.fn().mockResolvedValue({});
    render(
      <ServiceForm
        title="Beträge"
        fields={[
          { name: "amount", label: "Betrag", type: "decimal" },
          { name: "visitors", label: "Besucher", type: "number" },
        ]}
        initial={{ visitors: 5 }}
        onSubmit={save}
      />,
    );
    fireEvent.change(screen.getByLabelText("Betrag"), {
      target: { value: "10,25" },
    });
    fireEvent.change(screen.getByLabelText("Besucher"), {
      target: { value: "" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Beträge" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({ amount: "10.25", visitors: null }),
    );
  });
});
