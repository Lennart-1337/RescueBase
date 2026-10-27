import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { StatusActions } from "./status-actions";
import { serviceFixture } from "./test-fixtures";
const service = {
  ...serviceFixture,
  warnings: [
    { code: "SHORTAGE", message: "Eine Position ist offen.", entityId: null },
  ],
};
describe("service lifecycle actions", () => {
  it("shows one next action and asks for release justification only in its dialog", async () => {
    const onTransition = vi.fn().mockResolvedValue({});
    render(<StatusActions service={service} onTransition={onTransition} />);
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.queryByText("Eine Position ist offen.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Freigeben" }));
    const dialog = screen.getByRole("dialog", { name: "Dienst freigeben" });
    expect(
      within(dialog).getByText("Eine Position ist offen."),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("textbox", { name: "Begründung" }),
    ).toBeRequired();
    fireEvent.change(
      within(dialog).getByRole("textbox", { name: "Begründung" }),
      { target: { value: "Position wird durch Auftraggeber gestellt." } },
    );
    fireEvent.submit(
      within(dialog).getByRole("form", { name: "Dienststatus ändern" }),
    );
    await waitFor(() =>
      expect(onTransition).toHaveBeenCalledWith(
        "RELEASED",
        "Position wird durch Auftraggeber gestellt.",
      ),
    );
  });
  it("makes correction reopening explicit and keeps its reason mandatory", () => {
    render(
      <StatusActions
        service={{ ...service, status: "COMPLETED" }}
        onTransition={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Korrektur öffnen" }));
    const dialog = screen.getByRole("dialog", { name: "Korrektur öffnen" });
    expect(
      within(dialog).getByRole("textbox", { name: "Begründung" }),
    ).toBeRequired();
  });
  it("keeps alternative actions available and does not hide server conflicts", async () => {
    render(
      <StatusActions
        service={service}
        onTransition={vi.fn().mockRejectedValue(new Error("Bitte neu laden."))}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Freigeben" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Aktion"), {
      target: { value: "CANCELLED" },
    });
    fireEvent.change(
      within(dialog).getByRole("textbox", { name: "Begründung" }),
      { target: { value: "Veranstalter hat abgesagt." } },
    );
    fireEvent.submit(within(dialog).getByRole("form"));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Bitte neu laden.",
    );
  });
});
