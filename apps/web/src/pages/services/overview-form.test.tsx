import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ServiceForm, type ServiceField } from "./form";
import {
  normalizeOverview,
  overviewFields,
  overviewInitial,
} from "./service-fields";
import { catalogFixture } from "./test-fixtures";
const times = {
  eventStartsAt: "2026-11-08T09:00:00.000Z",
  eventEndsAt: "2026-11-08T16:00:00.000Z",
};
const base = {
  title: "Stadtlauf",
  eventType: "Sport",
  customer: "Verein",
  location: "Park",
  ...times,
};
const renderOverview = (initial = {}) =>
  render(
    <ServiceForm
      title="Dienst"
      hideLegend
      fields={overviewFields(catalogFixture)}
      initial={overviewInitial(initial)}
      onSubmit={vi.fn().mockResolvedValue({})}
    />,
  );
describe("concise service overview form", () => {
  it("starts with six required fields and one responsible selector", () => {
    const { container } = renderOverview();
    expect(
      container.querySelectorAll("input[required],select[required]"),
    ).toHaveLength(6);
    expect(screen.getByLabelText("Verantwortlich")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ansprechpartner")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Eigener Dienstbeginn"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Weitere Angaben")).toBeInTheDocument();
    expect(container.querySelector("legend")).toBeNull();
  });
  it("reveals optional contact fields in one disclosure", () => {
    renderOverview();
    fireEvent.click(screen.getByText("Weitere Angaben"));
    expect(screen.getByLabelText("Ansprechpartner")).toBeInTheDocument();
    expect(screen.getByLabelText("Veranstalter")).toBeInTheDocument();
    expect(screen.getByLabelText("Auftragsbeschreibung")).toBeInTheDocument();
    expect(
      screen.queryByText(/Mindestbesetzung, Qualifikationen/),
    ).not.toBeInTheDocument();
  });
  it("derives duty times from event times and removes the UI flag", () => {
    expect(
      normalizeOverview({
        ...base,
        separateServiceTimes: false,
        startsAt: "old",
        endsAt: "old",
      }),
    ).toMatchObject({
      startsAt: times.eventStartsAt,
      endsAt: times.eventEndsAt,
    });
    expect(
      normalizeOverview({ ...base, separateServiceTimes: false }),
    ).not.toHaveProperty("separateServiceTimes");
  });
  it("detects existing differences and preserves exact times", () => {
    const initial = {
      ...base,
      startsAt: "2026-11-08T08:00:00.000Z",
      endsAt: "2026-11-08T17:00:00.000Z",
    };
    expect(overviewInitial(initial).separateServiceTimes).toBe(true);
    renderOverview(initial);
    expect(screen.getByLabelText("Abweichende Dienstzeiten")).toBeChecked();
    expect(screen.getByLabelText("Eigener Dienstbeginn")).toHaveValue(
      "08.11.2026 09:00",
    );
    expect(normalizeOverview(overviewInitial(initial))).toMatchObject(initial);
  });
  it.each(["2026-10-25T00:30:00.000Z", "2026-10-25T01:30:00.000Z"])(
    "preserves both Berlin folds for %s",
    async (start) => {
      const save = vi.fn().mockResolvedValue({});
      const initial = {
        ...base,
        eventStartsAt: start,
        eventEndsAt: "2026-10-25T03:30:00.000Z",
        startsAt: start,
        endsAt: "2026-10-25T03:30:00.000Z",
      };
      render(
        <ServiceForm
          title="Dienst"
          fields={overviewFields(catalogFixture)}
          initial={overviewInitial(initial)}
          onSubmit={(values) => save(normalizeOverview(values))}
        />,
      );
      fireEvent.submit(screen.getByRole("form", { name: "Dienst" }));
      await waitFor(() =>
        expect(save).toHaveBeenCalledWith(
          expect.objectContaining({ startsAt: start, eventStartsAt: start }),
        ),
      );
    },
  );
  it("recognizes different instants in the same repeated wall-clock hour", () => {
    const initial = {
      ...base,
      eventStartsAt: "2026-10-25T00:30:00.000Z",
      eventEndsAt: "2026-10-25T03:30:00.000Z",
      startsAt: "2026-10-25T01:30:00.000Z",
      endsAt: "2026-10-25T03:30:00.000Z",
    };
    renderOverview(initial);
    expect(screen.getByLabelText("Abweichende Dienstzeiten")).toBeChecked();
    expect(
      screen.getByLabelText("Veranstaltungsbeginn: Zeitumstellung"),
    ).toHaveValue("EARLIER");
    expect(
      screen.getByLabelText("Eigener Dienstbeginn: Zeitumstellung"),
    ).toHaveValue("LATER");
  });
  it("updates its form state when the initial record changes", () => {
    const save = vi.fn().mockResolvedValue({});
    const view = render(
      <ServiceForm
        title="Dienst"
        fields={overviewFields(catalogFixture)}
        initial={overviewInitial(base)}
        onSubmit={save}
      />,
    );
    expect(screen.getByLabelText("Dienstbezeichnung")).toHaveValue("Stadtlauf");
    view.rerender(
      <ServiceForm
        title="Dienst"
        fields={overviewFields(catalogFixture)}
        initial={overviewInitial({ ...base, title: "Konzert" })}
        onSubmit={save}
      />,
    );
    expect(screen.getByLabelText("Dienstbezeichnung")).toHaveValue("Konzert");
  });
  it("keeps optional fields after opening and closing the disclosure", async () => {
    const save = vi.fn().mockResolvedValue({});
    render(
      <ServiceForm
        title="Dienst"
        fields={overviewFields(catalogFixture)}
        initial={overviewInitial(base)}
        onSubmit={save}
      />,
    );
    fireEvent.click(screen.getByText("Weitere Angaben"));
    fireEvent.change(screen.getByLabelText("Ansprechpartner"), {
      target: { value: "Jörg Müller" },
    });
    fireEvent.click(screen.getByText("Weitere Angaben"));
    expect(screen.queryByLabelText("Ansprechpartner")).not.toBeInTheDocument();
    fireEvent.submit(screen.getByRole("form", { name: "Dienst" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ contactName: "Jörg Müller" }),
      ),
    );
  });
  it("does not parse or validate inactive required datetime controls", async () => {
    const save = vi.fn().mockResolvedValue({});
    const fields: ServiceField[] = [
      { name: "custom", label: "Eigenes Zeitfenster", type: "checkbox" },
      {
        name: "startsAt",
        label: "Beginn",
        type: "datetime-local",
        required: true,
        when: { field: "custom", equals: true },
      },
    ];
    render(
      <ServiceForm
        title="Bedingt"
        fields={fields}
        initial={{ startsAt: "2026-10-25T00:30:00.000Z" }}
        onSubmit={save}
      />,
    );
    expect(screen.queryByLabelText("Beginn")).not.toBeInTheDocument();
    fireEvent.submit(screen.getByRole("form", { name: "Bedingt" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ custom: false }));
  });
});
