import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Overview } from "./overview";
import { catalogFixture, serviceFixture } from "./test-fixtures";
describe("service overview", () => {
  it("starts with readable service details and opens editing deliberately", async () => {
    render(
      <Overview
        service={serviceFixture}
        catalog={catalogFixture}
        locked={false}
        save={vi.fn().mockResolvedValue({})}
        onTab={vi.fn()}
      />,
    );
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.getAllByText("Sportverein")).toHaveLength(2);
    fireEvent.click(
      screen.getByRole("button", { name: "Dienstangaben bearbeiten" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Dienst bearbeiten" });
    expect(
      within(dialog).getByRole("form", { name: "Dienstangaben" }),
    ).toBeInTheDocument();
  });
  it("links real planning counts and updates existing tasks without inventing tasks", async () => {
    const onTab = vi.fn();
    const save = vi.fn().mockResolvedValue({});
    const tasks = [
      {
        id: "task-1",
        title: "Rucksack vorbereiten",
        done: false,
        responsibleId: null,
        dueAt: null,
      },
    ];
    render(
      <Overview
        service={{ ...serviceFixture, tasks }}
        catalog={catalogFixture}
        locked={false}
        save={save}
        onTab={onTab}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Personal/ }));
    expect(onTab).toHaveBeenCalledWith("personnel");
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Rucksack vorbereiten" }),
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        tasks: [{ ...tasks[0], done: true }],
      }),
    );
  });
  it("keeps closed details read-only", () => {
    render(
      <Overview
        service={{ ...serviceFixture, status: "COMPLETED" }}
        catalog={catalogFixture}
        locked
        save={vi.fn()}
        onTab={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Dienstangaben bearbeiten" }),
    ).toBeNull();
    expect(screen.queryByRole("form")).toBeNull();
  });
});
