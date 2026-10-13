import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Inspections } from "./inspections";
import type { Device } from "./types";

const device: Device = { id: "device-1", name: "AED 1", version: 0, locationId: "loc-1", status: "RELEASED", reasons: [],
  requirements: [{ id: "stk-1", name: "STK", kind: "STK", title: "Sicherheitstechnische Kontrolle", source: "Gebrauchsanweisung", mandatory: true }],
  inspections: [], incidents: [], glucoseControls: [], assignments: [] };

it("offers direct completion and asks for protocol and device marking only for a passed STK", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Inspections device={device} people={[]} /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Prüfung abschließen" }));
  const dialog = within(screen.getByRole("dialog", { name: "Prüfung erfassen und abschließen" }));
  expect(dialog.queryByText(/Prüfprotokoll enthält Messwerte/)).not.toBeInTheDocument();
  fireEvent.change(dialog.getByLabelText("Prüfanforderung"), { target: { value: "stk-1" } });
  expect(dialog.getByText(/Prüfprotokoll enthält Messwerte/)).toBeInTheDocument();
  expect(dialog.queryByText(/Kennzeichnung ist am Gerät angebracht/)).not.toBeInTheDocument();
  fireEvent.change(dialog.getByLabelText("Ergebnis"), { target: { value: "PASSED" } });
  expect(dialog.getByText(/Kennzeichnung ist am Gerät angebracht/)).toBeInTheDocument();
});
