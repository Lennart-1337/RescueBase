import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Personnel } from "./personnel";
import { catalogFixture, serviceFixture } from "./test-fixtures";
const assignment = {
  id: "a",
  personId: "person-1",
  positionId: "p",
  qualification: "PARAMEDIC" as const,
  startsAt: serviceFixture.startsAt,
  endsAt: serviceFixture.endsAt,
  actualStartsAt: null,
  actualEndsAt: null,
  hourlyRate: "17.50",
};
it("edits attendance without pauses and preserves the person's hourly price", async () => {
  const save = vi.fn(async () => undefined);
  render(
    <Personnel
      service={{
        ...serviceFixture,
        assignments: [assignment],
        positions: [
          {
            id: "p",
            name: "Posten",
            qualification: "PARAMEDIC",
            quantity: 1,
            leader: false,
            team: null,
          },
        ],
      }}
      catalog={catalogFixture}
      save={save}
      locked={false}
    />,
  );
  expect(screen.queryByText(/Pause/)).not.toBeInTheDocument();
  const edit = screen.getAllByRole("button", { name: "Bearbeiten" });
  fireEvent.click(edit[edit.length - 1]!);
  expect(screen.queryByLabelText(/Pause/)).not.toBeInTheDocument();
  fireEvent.submit(screen.getByRole("form", { name: "Personal" }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({ assignments: [assignment] }),
  );
});
