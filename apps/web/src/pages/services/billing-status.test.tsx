import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BillingStatus } from "./billing-status";
import { serviceFixture } from "./test-fixtures";
it("saves all three independent flags, including after service completion", async () => {
  const onSave = vi.fn().mockResolvedValue({});
  render(<BillingStatus service={{ ...serviceFixture, status: "COMPLETED" }} onSave={onSave} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Angebot verschickt" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Rechnung bezahlt" }));
  fireEvent.click(screen.getByRole("button", { name: "Abrechnungsstatus speichern" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith({ offerSent: true, invoiceSent: false, invoicePaid: true }));
});
it("loads existing flags and allows corrections without sending on every click", () => {
  const onSave = vi.fn();
  render(<BillingStatus service={{ ...serviceFixture, offerSentAt: "2026-10-28T12:00:00Z" }} onSave={onSave} />);
  expect(screen.getByRole("checkbox", { name: "Angebot verschickt" })).toBeChecked();
  fireEvent.click(screen.getByRole("checkbox", { name: "Angebot verschickt" }));
  expect(onSave).not.toHaveBeenCalled();
});
it("keeps entered flags and shows a failed save", async () => {
  render(<BillingStatus service={serviceFixture} onSave={vi.fn().mockRejectedValue(new Error("Zwischenzeitlich geändert."))} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Rechnung verschickt" }));
  fireEvent.click(screen.getByRole("button", { name: "Abrechnungsstatus speichern" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Zwischenzeitlich geändert.");
  expect(screen.getByRole("checkbox", { name: "Rechnung verschickt" })).toBeChecked();
});
