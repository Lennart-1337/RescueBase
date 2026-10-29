import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BillingDocuments } from "./billing-documents";
import { serviceFixture } from "./test-fixtures";
import { exportBillingDocument } from "./billing-export";
import { useServices } from "./api";
import { ApiError } from "../../lib/openapi-client";
vi.mock("./billing-export", () => ({ exportBillingDocument: vi.fn() }));
vi.mock("./api", () => ({ useServices: vi.fn() }));
beforeEach(() => vi.mocked(useServices).mockReturnValue({ data: { offerValidityDays: 30, version: 0 }, isError: false, refetch: vi.fn() } as never));
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
    { kind: "INVOICE", number: "012-SAN-2026", issuedOn: "2026-10-29", recipient: serviceFixture.customer, salutation: "Sehr geehrte Damen und Herren,", settingsVersion: 0 }));
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
it("uses the configured validity and allows a personal salutation", () => {
  vi.mocked(useServices).mockReturnValue({ data: { offerValidityDays: 45, version: 3 }, isError: false, refetch: vi.fn() } as never);
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Angebot erstellen" }));
  fireEvent.change(screen.getByLabelText("Angebotsdatum"), { target: { value: "2026-10-06" } });
  fireEvent.change(screen.getByLabelText("Anrede"), { target: { value: "Sehr geehrte Frau Grittmann," } });
  expect(screen.getByText("Gültig bis 20.11.2026 (45 Tage)." )).toBeVisible();
  expect(screen.getByLabelText("Anrede")).toHaveValue("Sehr geehrte Frau Grittmann,");
});
it("blocks export if current issuer settings could not be loaded", () => {
  vi.mocked(useServices).mockReturnValue({ data: undefined, isError: true, refetch: vi.fn() } as never);
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Angebot erstellen" }));
  expect(screen.getByRole("button", { name: "PDF erstellen" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Einstellungen erneut laden" })).toBeEnabled();
});
it("refreshes a stale service or issuer configuration without losing document entries", async () => {
  vi.mocked(exportBillingDocument).mockRejectedValue(new ApiError("Bitte neu laden.", 409));
  const { invalidate } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Angebot erstellen" }));
  fireEvent.change(screen.getByLabelText("Angebotsnummer"), { target: { value: "007-SAN-2026" } });
  fireEvent.submit(screen.getByRole("form", { name: "Angebot erstellen" }));
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["services"] }));
  expect(screen.getByLabelText("Angebotsnummer")).toHaveValue("007-SAN-2026");
  expect(screen.getByRole("alert")).toHaveTextContent("Bitte neu laden.");
});
