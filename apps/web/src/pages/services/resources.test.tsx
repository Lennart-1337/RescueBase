import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Resources } from "./resources";
import { catalogFixture, serviceFixture } from "./test-fixtures";
const vehicle = {
  id: "vehicle-1",
  name: "MTF 1",
  registration: "WES-DL 1",
  type: "MTF",
  active: true,
  ready: true,
  notes: "",
  version: 1,
};
const props = {
  service: serviceFixture,
  catalog: { ...catalogFixture, vehicles: [vehicle] },
  locked: false,
  save: vi.fn(async () => undefined),
};
afterEach(() => vi.clearAllMocks());
it("shows catalog vehicles before a reservation exists and reserves the selected vehicle", async () => {
  render(<Resources {...props} />);
  expect(screen.getByText("MTF 1")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "MTF 1 reservieren" }));
  const dialog = screen.getByRole("dialog");
  expect(
    within(dialog).getByRole("combobox", { name: "Ressource" }),
  ).toHaveValue(vehicle.id);
  fireEvent.submit(
    within(dialog).getByRole("form", { name: "Reservierungszeitraum" }),
  );
  await waitFor(() =>
    expect(props.save).toHaveBeenCalledWith({
      reservations: [
        expect.objectContaining({
          kind: "VEHICLE",
          resourceId: vehicle.id,
          startsAt: serviceFixture.startsAt,
          endsAt: serviceFixture.endsAt,
        }),
      ],
    }),
  );
});
it("offers vehicles and kits but no new device reservations", () => {
  render(<Resources {...props} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Ressource reservieren" }),
  );
  const kind = screen.getByRole("combobox", { name: "Ressourcenart" });
  expect(
    within(kind).getByRole("option", { name: "Fahrzeug" }),
  ).toBeInTheDocument();
  expect(
    within(kind).getByRole("option", { name: "Rucksack" }),
  ).toBeInTheDocument();
  expect(
    within(kind).queryByRole("option", { name: "Gerät" }),
  ).not.toBeInTheDocument();
});
it("explains an empty fleet and links to vehicle master data", () => {
  render(<Resources {...props} catalog={catalogFixture} />);
  expect(screen.getByText("Noch keine Fahrzeuge angelegt.")).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Fahrzeuge verwalten" }),
  ).toHaveAttribute("href", "/admin/services?view=vehicles");
});
it("distinguishes an inactive fleet from an empty fleet", () => {
  render(
    <Resources
      {...props}
      catalog={{ ...props.catalog, vehicles: [{ ...vehicle, active: false }] }}
    />,
  );
  expect(screen.queryByText("MTF 1")).not.toBeInTheDocument();
  expect(screen.getByText("Keine aktiven Fahrzeuge verfügbar.")).toBeVisible();
});
it("preserves existing device reservations and allows their removal", async () => {
  render(
    <Resources
      {...props}
      catalog={{
        ...props.catalog,
        devices: [
          { id: "device-1", name: "AED 1", kitId: null, status: "READY" },
        ],
      }}
      service={{
        ...serviceFixture,
        reservations: [
          {
            id: "reservation-1",
            kind: "DEVICE",
            resourceId: "device-1",
            startsAt: serviceFixture.startsAt,
            endsAt: serviceFixture.endsAt,
          },
        ],
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Ansehen" }));
  expect(
    screen.queryByRole("combobox", { name: "Ressource" }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Reservierung entfernen" }),
  );
  await waitFor(() =>
    expect(props.save).toHaveBeenCalledWith({ reservations: [] }),
  );
});
it("prevents new reservations on completed services", () => {
  render(<Resources {...props} locked />);
  expect(
    screen.getByRole("button", { name: "MTF 1 reservieren" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Ressource reservieren" }),
  ).toBeDisabled();
});
