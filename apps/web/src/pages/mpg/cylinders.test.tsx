import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Cylinders } from "./cylinders";
import type { Cylinder } from "./types";

const cylinder: Cylinder = { id: "c1", version: 1, cylinderNumber: "O2-42", sizeLiters: 2, locationId: "l1", status: "FULL", inspectedAt: "2026-01-01", inspectionDueAt: "2027-01-01", expiresAt: "2028-01-01" };

it("keeps cylinder actions outside the table row and preserves the return flow", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Cylinders cylinders={[cylinder]} locations={[{ id: "l1", name: "Wache" }]} /></QueryClientProvider>);
  const table = screen.getByRole("table");
  expect(within(table).queryByRole("button", { name: /bearbeiten|rückgabe/i })).not.toBeInTheDocument();
  fireEvent.click(within(table).getByRole("button", { name: "O2-42 öffnen" }));
  expect(screen.getByRole("heading", { name: "O2-42" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Rückgabe" }));
  expect(screen.getByRole("dialog", { name: "O2-42 zurückgeben" })).toBeInTheDocument();
});
