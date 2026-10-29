import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BillingDocuments } from "./billing-documents";
import { serviceFixture } from "./test-fixtures";
import { exportBillingDocument } from "./billing-export";
vi.mock("./billing-export", () => ({ exportBillingDocument: vi.fn() }));
function setup() {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(<QueryClientProvider client={client}><BillingDocuments service={serviceFixture} /></QueryClientProvider>);
  return { invalidate };
}
afterEach(() => vi.clearAllMocks());
it("opens an offer form and calculates 30 calendar days across a year boundary", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Angebot erstellen" }));
  expect(screen.getByRole("dialog", { name: "Angebot erstellen" })).toBeVisible();
  expect(screen.getByLabelText("Angebotsnummer")).toBeRequired();
  fireEvent.change(screen.getByLabelText("Angebotsdatum"), { target: { value: "2026-12-15" } });
  expect(screen.getByText("Gültig bis 14.01.2027 (30 Tage)." )).toBeVisible();
});
it("exports a numbered invoice and refreshes stored documents without changing sent flags", async () => {
  vi.mocked(exportBillingDocument).mockResolvedValue(undefined);
  const { invalidate } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Rechnung erstellen" }));
  fireEvent.change(screen.getByLabelText("Rechnungsnummer"), { target: { value: "012-SAN-2026" } });
  fireEvent.change(screen.getByLabelText("Rechnungsdatum"), { target: { value: "2026-10-29" } });
  fireEvent.submit(screen.getByRole("form", { name: "Rechnung erstellen" }));
  await waitFor(() => expect(exportBillingDocument).toHaveBeenCalledWith(serviceFixture,
    { kind: "INVOICE", number: "012-SAN-2026", issuedOn: "2026-10-29", recipient: serviceFixture.customer }));
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["services"] }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
it("retains entries and shows the server error when export fails", async () => {
  vi.mocked(exportBillingDocument).mockRejectedValue(new Error("Rechnungsnummer bereits vergeben."));
  const { invalidate } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Rechnung erstellen" }));
  fireEvent.change(screen.getByLabelText("Rechnungsnummer"), { target: { value: "009-SAN-2026" } });
  fireEvent.submit(screen.getByRole("form", { name: "Rechnung erstellen" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Rechnungsnummer bereits vergeben."));
  expect(screen.getByLabelText("Rechnungsnummer")).toHaveValue("009-SAN-2026");
  expect(invalidate).not.toHaveBeenCalled();
});
it("allows billing completed services but prevents cancelled services", () => {
  const view = render(<BillingDocuments service={{ ...serviceFixture, status: "COMPLETED" }} />);
  expect(screen.getByRole("button", { name: "Rechnung erstellen" })).toBeEnabled();
  view.rerender(<BillingDocuments service={{ ...serviceFixture, status: "CANCELLED" }} />);
  expect(screen.getByRole("button", { name: "Rechnung erstellen" })).toBeDisabled();
});

it("requires the recipient and rejects more than eight address lines", async () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Angebot erstellen" }));
  expect(screen.getByLabelText("Empfängeranschrift")).toBeRequired();
  fireEvent.change(screen.getByLabelText("Angebotsnummer"), { target: { value: "012-SAN-2026" } });
  fireEvent.change(screen.getByLabelText("Empfängeranschrift"), { target: { value: Array(9).fill("Adresse").join("\n") } });
  fireEvent.submit(screen.getByRole("form", { name: "Angebot erstellen" }));
  expect(screen.getByRole("alert")).toHaveTextContent("höchstens 8 Zeilen");
  expect(exportBillingDocument).not.toHaveBeenCalled();
});
