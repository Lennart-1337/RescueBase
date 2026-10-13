import { fireEvent, render, screen, within } from "@testing-library/react";
import { Deadlines } from "./deadlines";
import type { Device } from "./types";

vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a href="/admin/mpg">{children}</a> }));

const requirement = (id: string, dueDate?: string) => ({ id, name: id, title: `Prüfung ${id}`, kind: "STK", source: "Hersteller", mandatory: true, dueDate });
const device = (id: string, status: string, dueDate?: string): Device => ({
  id, name: `Gerät ${id}`, status, reasons: status === "BLOCKED" ? ["Defekt dokumentiert"] : [],
  requirements: dueDate ? [requirement(id, dueDate)] : [],
  inspections: [], glucoseControls: [], incidents: [], assignments: [], locationId: "location", version: 1
});

describe("MPG-Termine", () => {
  it("shows blocked devices without a due date and separates overdue and upcoming checks", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T12:00:00Z"));
    try {
      render(<Deadlines devices={[device("gesperrt", "BLOCKED"), device("alt", "RELEASED", "2026-09-01"), device("bald", "RELEASED", "2026-10-01"), device("grenze", "RELEASED", "2026-10-22T00:00:00.000Z"), device("später", "RELEASED", "2026-12-01")]} />);
      expect(screen.getByText("Defekt dokumentiert")).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Zeitraum und Sperren"), { target: { value: "OVERDUE" } });
      expect(within(screen.getByRole("table")).getByText("Gerät alt")).toBeInTheDocument();
      expect(within(screen.getByRole("table")).queryByText("Gerät bald")).not.toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Zeitraum und Sperren"), { target: { value: "UPCOMING" } });
      expect(within(screen.getByRole("table")).getByText("Gerät bald")).toBeInTheDocument();
      expect(within(screen.getByRole("table")).getByText("Gerät grenze")).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Zeitraum und Sperren"), { target: { value: "BLOCKED" } });
      expect(within(screen.getByRole("table")).getByRole("link", { name: "Gerät gesperrt" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Filter zurücksetzen" }));
      expect(within(screen.getByRole("table")).getByText("Gerät später")).toBeInTheDocument();
    } finally { vi.useRealTimers(); }
  });
});
