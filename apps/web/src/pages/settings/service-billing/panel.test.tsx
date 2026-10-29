import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ServiceBillingSettingsPanel } from "./panel";
import { getServiceBillingSettings, saveServiceBillingSettings } from "../../../lib/service-billing-settings";
import { billingSettingsFixture } from "./test-fixture";
vi.mock("../../../lib/service-billing-settings", () => ({ billingSettingsKey: ["settings", "service-billing"], getServiceBillingSettings: vi.fn(), saveServiceBillingSettings: vi.fn() }));
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(<QueryClientProvider client={client}><ServiceBillingSettingsPanel /></QueryClientProvider>);
  return { invalidate };
}
beforeEach(() => { vi.mocked(getServiceBillingSettings).mockResolvedValue(billingSettingsFixture); });
afterEach(() => vi.resetAllMocks());
it("loads the configured sender, bank and document terms", async () => {
  setup();
  expect(await screen.findByLabelText("Straße und Hausnummer")).toHaveValue("Döpperstraße 47");
  expect(screen.getByLabelText("Organisation / Vereinsname")).toHaveValue(billingSettingsFixture.organizationName);
  expect(screen.getByLabelText("Angebotsgültigkeit in Tagen")).toHaveValue(30);
  expect(screen.getByLabelText("Zahlungsfrist in Tagen")).toHaveValue(14);
  expect(screen.getByLabelText("IBAN")).toBeRequired();
});
it("saves all settings with their version and refreshes export defaults", async () => {
  const updated = { ...billingSettingsFixture, street: "Neue Straße 5", offerValidityDays: 45, version: 3 };
  vi.mocked(saveServiceBillingSettings).mockResolvedValue(updated);
  const { invalidate } = setup();
  fireEvent.change(await screen.findByLabelText("Straße und Hausnummer"), { target: { value: updated.street } });
  fireEvent.change(screen.getByLabelText("Angebotsgültigkeit in Tagen"), { target: { value: "45" } });
  fireEvent.submit(screen.getByRole("form", { name: "Angebote und Rechnungen" }));
  await waitFor(() => expect(saveServiceBillingSettings).toHaveBeenCalledWith({ ...updated, version: 2 }));
  expect(await screen.findByRole("status")).toHaveTextContent("Einstellungen gespeichert.");
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["services", "/billing-settings"] });
});
it("retains unsaved values after a conflict and shows the server error", async () => {
  vi.mocked(saveServiceBillingSettings).mockRejectedValue(new Error("Zwischenzeitlich geändert. Bitte neu laden."));
  setup();
  fireEvent.change(await screen.findByLabelText("Straße und Hausnummer"), { target: { value: "Meine Änderung 1" } });
  fireEvent.submit(screen.getByRole("form", { name: "Angebote und Rechnungen" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Zwischenzeitlich geändert");
  expect(screen.getByLabelText("Straße und Hausnummer")).toHaveValue("Meine Änderung 1");
});
it("shows loading failures with a retry action and no fabricated settings", async () => {
  vi.mocked(getServiceBillingSettings).mockRejectedValueOnce(new Error("Verbindung unterbrochen"));
  setup();
  expect(await screen.findByRole("alert")).toHaveTextContent("Verbindung unterbrochen");
  expect(screen.queryByLabelText("Straße und Hausnummer")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Erneut laden" }));
  expect(await screen.findByLabelText("Straße und Hausnummer")).toHaveValue("Döpperstraße 47");
});
