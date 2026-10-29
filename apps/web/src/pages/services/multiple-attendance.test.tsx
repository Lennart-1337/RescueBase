import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { PersonnelAssignments } from "./personnel-assignments";
import { PersonnelPositions } from "./personnel-positions";
import { PersonnelPrices } from "./personnel-prices";
import { OverviewPlanning } from "./overview-planning";
import { catalogFixture, serviceFixture } from "./test-fixtures";
const morning = { id: "morning", personId: "person-1", positionId: "p", qualification: "PARAMEDIC" as const,
  startsAt: "2026-11-08T08:00:00Z", endsAt: "2026-11-08T10:00:00Z", hourlyRate: "12.50",
  actualStartsAt: null, actualEndsAt: null };
const evening = { ...morning, id: "evening", startsAt: "2026-11-08T15:00:00Z", endsAt: "2026-11-08T17:00:00Z" };
const service = { ...serviceFixture, assignments: [morning, evening], positions: [
  { id: "p", name: "Posten", qualification: "PARAMEDIC" as const, quantity: 1, leader: false, team: null },
] };
it("can add the same person for an evening attendance", async () => {
  const save = vi.fn().mockResolvedValue({});
  render(<PersonnelAssignments service={{ ...service, assignments: [morning] }} catalog={catalogFixture} save={save} locked={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Person einteilen" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Person" }), { target: { value: "person-1" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Position" }), { target: { value: "p" } });
  fireEvent.change(screen.getByLabelText("Geplanter Beginn"), { target: { value: "2026-11-08T16:00" } });
  fireEvent.change(screen.getByLabelText("Geplantes Ende"), { target: { value: "2026-11-08T18:00" } });
  fireEvent.submit(screen.getByRole("form", { name: "Personal" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ assignments: [morning,
    expect.objectContaining({ personId: "person-1", startsAt: "2026-11-08T15:00:00.000Z", endsAt: "2026-11-08T17:00:00.000Z" }),
  ] }));
});
it("editing one period retains the other attendance unchanged", async () => {
  const save = vi.fn().mockResolvedValue({});
  render(<PersonnelAssignments service={service} catalog={catalogFixture} save={save} locked={false} />);
  const rows = screen.getAllByRole("row").filter((row) => within(row).queryByText("Jana Müller"));
  fireEvent.click(within(rows[1]!).getByRole("button", { name: "Bearbeiten" }));
  fireEvent.change(screen.getByLabelText("Geplantes Ende"), { target: { value: "2026-11-08T17:30" } });
  fireEvent.submit(screen.getByRole("form", { name: "Personal" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ assignments: [morning, { ...evening, endsAt: "2026-11-08T16:30:00.000Z" }] }));
});
it("distinguishes hourly price fields by attendance period", () => {
  render(<PersonnelPrices assignments={service.assignments} people={catalogFixture.people} rates={["12.50", "12.50"]} onRate={vi.fn()} />);
  const inputs = screen.getAllByRole("textbox");
  expect(inputs[0]!.getAttribute("aria-label")).not.toBe(inputs[1]!.getAttribute("aria-label"));
  expect(screen.getByText(/08.11.2026, 09:00/)).toBeInTheDocument();
});
it("counts one person rather than two attendance periods in the overview", () => {
  render(<OverviewPlanning service={service} onTab={vi.fn()} />);
  expect(screen.getByText("1 eingeplant · Bedarf 1")).toBeInTheDocument();
});
it("removes only the selected period", async () => {
  const save = vi.fn().mockResolvedValue({});
  const confirmation = vi.spyOn(window, "confirm").mockReturnValue(true);
  try {
    render(<PersonnelAssignments service={service} catalog={catalogFixture} save={save} locked={false} />);
    const rows = screen.getAllByRole("row").filter((row) => within(row).queryByText("Jana Müller"));
    fireEvent.click(within(rows[1]!).getByRole("button", { name: "Bearbeiten" }));
    fireEvent.click(screen.getByRole("button", { name: "Eintrag entfernen" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ assignments: [morning] }));
  } finally { confirmation.mockRestore(); }
});

it("counts distinct people in the position headcount", () => {
  render(<PersonnelPositions service={service} catalog={catalogFixture} save={vi.fn()} locked={false} />);
  expect(screen.getByText("1 / 1")).toBeInTheDocument();
});
