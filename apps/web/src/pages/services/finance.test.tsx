import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Finance } from "./finance";
import { catalogFixture, serviceFixture } from "./test-fixtures";
const assignment = {
  id: "assignment-1",
  personId: "person-1",
  positionId: "position-1",
  qualification: "PARAMEDIC" as const,
  hourlyRate: "12.50",
  startsAt: "2026-11-08T08:00:00.000Z",
  endsAt: "2026-11-08T10:00:00.000Z",
  actualStartsAt: null,
  actualEndsAt: null,
};
const service = {
  ...serviceFixture,
  assignments: [assignment],
  materialDiscounted: false,
};
const props = {
  service,
  catalog: catalogFixture,
  locked: false,
  save: vi.fn(async () => undefined),
};
afterEach(() => vi.clearAllMocks());
it("starts material at 35 EUR and keeps an edited amount when toggling the discount", async () => {
  render(<Finance {...props} />);
  const amount = screen.getByLabelText("Materialpauschale (EUR)");
  expect(amount).toHaveValue("35.00");
  fireEvent.change(amount, { target: { value: "47,25" } });
  expect(screen.getByText("Gesamt geplant").nextElementSibling).toHaveTextContent("72,25");
  fireEvent.click(screen.getByLabelText("Materialpauschale als Rabatt"));
  expect(screen.getByText(/Rabatt: 47,25/)).toBeVisible();
  expect(screen.getByText("Gesamt geplant").nextElementSibling).toHaveTextContent("25,00");
  fireEvent.click(screen.getByRole("button", { name: "Kalkulation speichern" }));
  await waitFor(() => expect(props.save).toHaveBeenCalledWith({
    assignments: [assignment], materialRate: "47.25", materialDiscounted: true, additionalCharges: [],
  }));
  fireEvent.click(screen.getByLabelText("Materialpauschale als Rabatt"));
  expect(amount).toHaveValue("47,25");
  expect(screen.getByText("Gesamt geplant").nextElementSibling).toHaveTextContent("72,25");
});
it("calculates full attendance hours plus the default material charge without cost or tariff editors", () => {
  render(<Finance {...props} />);
  expect(
    screen.getByLabelText("Stundenpreis für Jana Müller (EUR)"),
  ).toHaveValue("12.50");
  expect(
    screen.getByText("Gesamt geplant").nextElementSibling,
  ).toHaveTextContent("60,00");
  expect(
    screen.getByText("Gesamt tatsächlich").nextElementSibling,
  ).toHaveTextContent("Nicht erfasst");
  expect(
    screen.queryByRole("button", { name: "Tarif übernehmen" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Preis vereinbaren" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Position hinzufügen" }),
  ).not.toBeInTheDocument();
});
it("rejects invalid material prices even with an active discount", async () => {
  render(<Finance {...props} />);
  fireEvent.click(screen.getByLabelText("Materialpauschale als Rabatt"));
  fireEvent.change(screen.getByLabelText("Materialpauschale (EUR)"), { target: { value: "-1" } });
  expect(screen.getByText("Gesamt geplant").nextElementSibling).toHaveTextContent("–");
  fireEvent.click(screen.getByRole("button", { name: "Kalkulation speichern" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Materialpauschale");
  expect(props.save).not.toHaveBeenCalled();
});
it("previews a discounted material charge as zero and persists individual hourly prices", async () => {
  render(<Finance {...props} />);
  fireEvent.change(
    screen.getByLabelText("Stundenpreis für Jana Müller (EUR)"),
    { target: { value: "15,75" } },
  );
  fireEvent.click(screen.getByLabelText("Materialpauschale als Rabatt"));
  expect(
    screen.getByText("Gesamt geplant").nextElementSibling,
  ).toHaveTextContent("31,50");
  expect(screen.getByText(/Rabatt: 35,00/)).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Kalkulation speichern" }),
  );
  await waitFor(() =>
    expect(props.save).toHaveBeenCalledWith({
      assignments: [{ ...assignment, hourlyRate: "15.75" }],
      materialDiscounted: true,
      materialRate: "35.00",
      additionalCharges: [],
    }),
  );
});
it("uses actual attendance for the actual total and protects completed services", () => {
  render(
    <Finance
      {...props}
      locked
      service={{
        ...service,
        assignments: [
          {
            ...assignment,
            actualStartsAt: assignment.startsAt,
            actualEndsAt: "2026-11-08T11:00:00.000Z",
          },
        ],
        costs: {
          ...service.costs,
          planned: { cost: "0", revenue: "60", result: "60" },
          actual: { ...service.costs.actual, revenue: "72.50", complete: true },
        },
      }}
    />,
  );
  expect(
    screen.getByText("Gesamt tatsächlich").nextElementSibling,
  ).toHaveTextContent("72,50");
  expect(
    screen.getByLabelText("Stundenpreis für Jana Müller (EUR)"),
  ).toBeDisabled();
  expect(screen.getByLabelText("Materialpauschale als Rabatt")).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Kalkulation speichern" }),
  ).toBeDisabled();
});
it("keeps save errors visible without discarding the entered price", async () => {
  render(
    <Finance
      {...props}
      save={vi.fn().mockRejectedValue(new Error("Bitte neu laden."))}
    />,
  );
  fireEvent.change(
    screen.getByLabelText("Stundenpreis für Jana Müller (EUR)"),
    { target: { value: "18" } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Kalkulation speichern" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Bitte neu laden.",
  );
  expect(
    screen.getByLabelText("Stundenpreis für Jana Müller (EUR)"),
  ).toHaveValue("18");
});
it("rejects invalid rates without showing stale totals or sending a request", async () => {
  render(<Finance {...props} />);
  fireEvent.change(
    screen.getByLabelText("Stundenpreis für Jana Müller (EUR)"),
    { target: { value: "-2" } },
  );
  expect(
    screen.getByText("Gesamt geplant").nextElementSibling,
  ).toHaveTextContent("–");
  fireEvent.click(
    screen.getByRole("button", { name: "Kalkulation speichern" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "gültige Stundenpreise",
  );
  expect(props.save).not.toHaveBeenCalled();
});
it("preserves completed legacy totals without displaying invented hourly prices", () => {
  render(
    <Finance
      {...props}
      locked
      service={{
        ...service,
        pricingModel: "LEGACY",
        costs: {
          ...service.costs,
          agreedRevenue: "123.45",
          actual: { ...service.costs.actual, complete: true },
        },
      }}
    />,
  );
  expect(
    screen.getByText("Gesamt geplant").nextElementSibling,
  ).toHaveTextContent("123,45");
  expect(
    screen.getByText("Gesamt tatsächlich").nextElementSibling,
  ).toHaveTextContent("123,45");
  expect(
    screen.queryByLabelText("Stundenpreis für Jana Müller (EUR)"),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText("Materialpauschale als Rabatt"),
  ).not.toBeInTheDocument();
});
