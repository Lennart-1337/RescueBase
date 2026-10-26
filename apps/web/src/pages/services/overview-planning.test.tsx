import { fireEvent, render, screen } from "@testing-library/react";
import { OverviewPlanning } from "./overview-planning";
import { serviceFixture } from "./test-fixtures";
import type { ServiceAssignment } from "./types";
const position = {
  id: "position-1",
  name: "Sanitätsposten",
  qualification: "SANITARIAN" as const,
  leader: false,
  quantity: 1,
  team: null,
};
function assignment(
  id: string,
  startsAt: string,
  endsAt: string,
): ServiceAssignment {
  return {
    id,
    personId: `person-${id}`,
    positionId: position.id,
    qualification: "SANITARIAN",
    startsAt,
    endsAt,
    breakMinutes: 0,
    actualStartsAt: null,
    actualEndsAt: null,
    actualBreakMinutes: 0,
  };
}
describe("overview planning counts", () => {
  it("separates assigned people from simultaneous demand for consecutive participation", () => {
    const onTab = vi.fn();
    render(
      <OverviewPlanning
        service={{
          ...serviceFixture,
          positions: [position],
          assignments: [
            assignment(
              "a",
              "2026-11-08T08:00:00.000Z",
              "2026-11-08T12:00:00.000Z",
            ),
            assignment(
              "b",
              "2026-11-08T12:00:00.000Z",
              "2026-11-08T17:00:00.000Z",
            ),
          ],
        }}
        onTab={onTab}
      />,
    );
    expect(screen.getByText("2 eingeplant · Bedarf 1")).toBeInTheDocument();
    expect(screen.queryByText(/2 von 1 besetzt/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Personal/ }));
    expect(onTab).toHaveBeenCalledWith("personnel");
  });
  it("uses real warning state without making a staffing coverage claim", () => {
    render(
      <OverviewPlanning
        service={{
          ...serviceFixture,
          positions: [position],
          warnings: [
            {
              code: "UNDERSTAFFED",
              message: "Position ist nicht durchgehend besetzt.",
              entityId: position.id,
            },
          ],
        }}
        onTab={vi.fn()}
      />,
    );
    expect(screen.getByText("0 eingeplant · Bedarf 1")).toHaveClass(
      "service-planning-warning",
    );
    expect(screen.getByLabelText("Planungshinweis")).toBeInTheDocument();
  });
  it("uses clear empty states for demand, resources and tasks", () => {
    render(<OverviewPlanning service={serviceFixture} onTab={vi.fn()} />);
    expect(screen.getByText("0 eingeplant · Bedarf offen")).toBeInTheDocument();
    expect(screen.getByText("Keine reserviert")).toBeInTheDocument();
    expect(screen.getByText("Keine Aufgaben")).toBeInTheDocument();
    expect(screen.queryByText("0 von 0 erledigt")).not.toBeInTheDocument();
  });
});
