import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MpgFormDialog } from "./form-dialog";

describe("MpgFormDialog", () => {
  it("submits from the standard dialog footer and closes after success", async () => {
    const close = vi.fn();
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<MpgFormDialog fields={[{ label: "Name", name: "name", required: true }]} onClose={close} onSubmit={submit} open submitLabel="Gerät erfassen" title="Gerät erfassen" />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "AED" } });
    fireEvent.click(screen.getByRole("button", { name: "Gerät erfassen" }));

    await waitFor(() => expect(submit).toHaveBeenCalledWith({ name: "AED" }));
    expect(close).toHaveBeenCalledOnce();
  });

  it("keeps the dialog open and shows API errors", async () => {
    const close = vi.fn();
    render(<MpgFormDialog fields={[]} onClose={close} onSubmit={async () => { throw new Error("Speichern nicht möglich"); }} open title="Prüfung abschließen" />);
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Speichern nicht möglich");
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Prüfung abschließen" })).toBeInTheDocument();
  });
});
