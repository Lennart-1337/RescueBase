import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DeviceControls } from "./device-controls";
import type { Device } from "./types";

const device: Device = { id: "device-1", name: "BZ 1", version: 0, locationId: "loc-1", status: "DRAFT", reasons: [],
  mpgModel: { id: "model-1", name: "BZ Modell", manufacturer: "Hersteller", manufacturerAddress: "Berlin", productType: "Blutzucker", version: 0, requirements: [],
    glucoseRanges: [{ id: "range-1", solutionName: "Kontrolllösung", solutionLot: "LOT-1", solutionExpiresAt: "2027-01-01", stripLot: "STRIP-1",
      controlLevel: "Normal", unit: "mg/dL", targetMin: 80, targetMax: 120, source: "Herstellerangabe" }] },
  requirements: [], inspections: [], incidents: [], glucoseControls: [], assignments: [] };

it("asks for measurement and a documented batch range instead of re-entering the bounds", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><DeviceControls device={device} people={[{ id: "person-1", name: "Prüfperson", active: true, instructorAuthorized: false, version: 0 }]} view="glucose" /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Kontrollmessung" }));
  const dialog = within(screen.getByRole("dialog", { name: "BZ-Kontrollmessung erfassen" }));
  expect(dialog.getByLabelText("Kontrollmittel, Charge und Sollbereich")).toBeRequired();
  expect(dialog.getByLabelText("Messwert in der angegebenen Einheit")).toBeRequired();
  expect(dialog.getByLabelText("Abweichende Geräteeinheit (nur falls anders)")).not.toBeRequired();
  expect(dialog.queryByLabelText("Sollbereich von")).not.toBeInTheDocument();
  expect(dialog.queryByLabelText("Einheit des Sollbereichs")).not.toBeInTheDocument();
});
