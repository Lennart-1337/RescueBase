import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { Trainings } from "./trainings";
import type { Training } from "./types";

const catalog = { kits: [], locations: [], people: [], users: [], models: [{ id: "m1", name: "AED Pro", manufacturer: "Rescue", manufacturerAddress: "Berlin", productType: "AED", version: 0, requirements: [] }] };
const training: Training = { id: "t1", version: 2, modelId: "m1", performedAt: "2026-09-14", contents: "Bedienung", instructorId: "p1", confirmations: [
  { id: "c1", personId: "p1", role: "INSTRUCTOR", nameSnapshot: "Einweisende Person", confirmedAt: "2026-09-14" },
  { id: "c2", personId: "p2", role: "PARTICIPANT", nameSnapshot: "Teilnehmende Person", confirmedAt: "2026-09-14" }
] };

it("does not require a separate finish action once all participants signed", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Trainings catalog={catalog} trainings={[training]} /></QueryClientProvider>);
  expect(screen.queryByRole("button", { name: /abschließen/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /bestätigung erfassen/i })).not.toBeInTheDocument();
});
