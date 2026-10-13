import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { Cylinders } from "./cylinders";
import type { Catalog } from "./devices";
import { People } from "./people";
import { Trainings } from "./trainings";

const catalog: Catalog = { kits: [], locations: [], models: [], people: [], users: [] };
function setup(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

describe("corrected MPG workflows", () => {
  it("requires a birth date without obsolete person fields", () => {
    setup(<People people={[]} users={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Person anlegen" }));
    expect(screen.getByLabelText("Geburtsdatum")).toBeRequired();
    expect(screen.queryByLabelText("Interne Kennung")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Zugehörigkeit")).not.toBeInTheDocument();
  });

  it("keeps an incomplete legacy person editable instead of crashing the people view", () => {
    setup(<People people={[{ id: "legacy-person", name: "Alte Person", birthDate: null, active: true, instructorAuthorized: false, version: 0 }]} users={[]} />);
    expect(screen.getAllByText("Alte Person")).toHaveLength(2);
    expect(screen.getAllByText(/Geburtsdatum fehlt/)).not.toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    expect(screen.getByLabelText("Geburtsdatum")).toBeRequired();
  });

  it("captures required cylinder dates without supplier or reducer assignment", () => {
    setup(<Cylinders cylinders={[]} locations={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Tauschflasche erfassen" }));
    expect(screen.getByLabelText("Geprüft am")).toBeRequired();
    expect(screen.getByLabelText("Prüfung fällig")).toBeRequired();
    expect(screen.getByLabelText("Verfall")).toBeRequired();
    expect(screen.queryByLabelText("Lieferant")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Druckminderer")).not.toBeInTheDocument();
  });

  it("creates model-wide training with an optional document version", () => {
    setup(<Trainings catalog={catalog} trainings={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Einweisung anlegen" }));
    const dialog = within(screen.getByRole("dialog", { name: "Einweisung anlegen" }));
    expect(dialog.getByLabelText("Modell")).toBeRequired();
    expect(dialog.getByLabelText("Verwendete Dokumentversion (optional)")).not.toBeRequired();
    expect(dialog.queryByLabelText("Optionales Einzelgerät")).not.toBeInTheDocument();
    expect(dialog.queryByLabelText("Geltungsbereich")).not.toBeInTheDocument();
  });
});
