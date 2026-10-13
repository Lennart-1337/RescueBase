import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { DeviceEvidence } from "./device-evidence";
import type { Device } from "./types";

const device: Device = {
  id: "device-1", name: "BZ-Gerät", version: 1, locationId: "location-1", status: "RELEASED", reasons: [],
  mpgModel: { id: "model-1", name: "BZ-Gerät", manufacturer: "Hersteller", manufacturerAddress: "Adresse", productType: "Blutzucker", version: 1, requirements: [] },
  requirements: [], inspections: [], incidents: [], glucoseControls: [], assignments: []
};

it("separates inspections, requirements, incidents and BZ controls in the device record", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><DeviceEvidence device={device} people={[]} /></QueryClientProvider>);
  expect(screen.getByRole("heading", { name: "Prüfungen und Wartung" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Defekte und Vorkommnisse" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Vorkommnisse" }));
  expect(screen.getByRole("heading", { name: "Defekte und Vorkommnisse" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Prüfungen und Wartung" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "BZ-Kontrollen" }));
  expect(screen.getByRole("heading", { name: "BZ-Qualitätskontrollen" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Anforderungen" }));
  expect(screen.getByRole("heading", { name: "Zusätzliche Prüfanforderungen" })).toBeInTheDocument();
});

it("shows the selected inspection as a structured record with its actions", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const inspected: Device = { ...device, inspections: [{
    id: "inspection-1", version: 1, requirementId: "requirement-1", performedAt: "2026-09-22", result: "PASSED", notes: "Prüfung ohne Befund",
    requirement: { id: "requirement-1", name: "STK", title: "STK", kind: "STK", source: "Hersteller", mandatory: true }
  }] };
  render(<QueryClientProvider client={client}><DeviceEvidence device={inspected} people={[]} /></QueryClientProvider>);
  const detail = screen.getByRole("region", { name: "Ausgewählte Prüfung" });
  expect(detail).toHaveTextContent("Prüfung ohne Befund");
  expect(detail).toHaveTextContent("22.9.2026");
  expect(detail).toHaveTextContent("Bestanden");
  expect(detail.querySelector("header")).toContainElement(screen.getByRole("button", { name: "Entwurf bearbeiten" }));
});
