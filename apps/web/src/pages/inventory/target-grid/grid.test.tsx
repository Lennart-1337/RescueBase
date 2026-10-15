import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import {
  article,
  batch,
  inventoryTarget,
  location,
} from "../../../test-support/fixtures";
import {
  changeValue,
  clickElement,
  renderAppAt,
  requestBody,
  resetTestBrowser,
  stubFetch,
} from "../../../test-support/app-test-helpers";
const second = {
  ...article,
  id: "second",
  name: "Spritze 5ml",
  shortName: "Spritze 5ml",
};
const routes = () => ({
  "/api/auth/setup/status": { initialized: true },
  "/api/auth/session": {
    user: {
      id: "admin",
      email: "admin@example.test",
      displayName: "Admin",
      role: "ADMIN",
    },
  },
  "/api/catalog/articles": [article, second],
  "/api/catalog/locations": [
    location,
    { ...location, id: "other", name: "Fahrzeug" },
  ],
  "/api/inventory/batches": [batch],
  "/api/inventory/targets": [inventoryTarget],
  "/api/inventory/targets/bulk": [],
});
afterEach(resetTestBrowser);
it("shows every article and saves only edited quantities together", async () => {
  stubFetch(routes());
  await renderAppAt("/admin/inventory?view=targets");
  const table = await screen.findByRole("table", { name: "Mindestbestände" });
  expect(within(table).getAllByRole("row")).toHaveLength(3);
  await changeValue(
    screen.getByRole("textbox", { name: "Spritze 5ml Mindestmenge" }),
    "12",
  );
  expect(requestBody("/api/inventory/targets/bulk", "PUT")).toBeUndefined();
  await clickElement(
    screen.getByRole("button", { name: "Änderungen speichern" }),
  );
  await waitFor(() =>
    expect(requestBody("/api/inventory/targets/bulk", "PUT")).toEqual({
      locationId: location.id,
      changes: [
        {
          articleId: "second",
          targetQuantity: 12,
          expectedTargetQuantity: null,
        },
      ],
    }),
  );
});
it("protects unsaved quantities when switching warehouses", async () => {
  stubFetch(routes());
  await renderAppAt("/admin/inventory?view=targets");
  const cell = await screen.findByRole("textbox", {
    name: "Spritze 5ml Mindestmenge",
  });
  await changeValue(cell, "7");
  await changeValue(screen.getByRole("combobox", { name: "Lager" }), "other");
  const dialog = await screen.findByRole("dialog", {
    name: "Ungespeicherte Änderungen",
  });
  await clickElement(
    within(dialog).getByRole("button", { name: "Weiter bearbeiten" }),
  );
  expect(cell).toHaveValue("7");
  expect(screen.getByRole("combobox", { name: "Lager" })).toHaveValue(
    location.id,
  );
});
it("moves between editable cells with Enter and pastes an Excel column", async () => {
  stubFetch(routes());
  await renderAppAt("/admin/inventory?view=targets");
  const table = await screen.findByRole("table", { name: "Mindestbestände" });
  const cells = within(table).getAllByRole("textbox");
  cells[0]!.focus();
  fireEvent.keyDown(cells[0]!, { key: "Enter" });
  expect(cells[1]).toHaveFocus();
  fireEvent.paste(cells[0]!, { clipboardData: { getData: () => "5\n8" } });
  expect(cells[0]).toHaveValue("5");
  expect(cells[1]).toHaveValue("8");
});
it("blocks leaving the target view until changes are discarded", async () => {
  stubFetch(routes());
  await renderAppAt("/admin/inventory?view=targets");
  await changeValue(
    await screen.findByRole("textbox", { name: "Spritze 5ml Mindestmenge" }),
    "9",
  );
  await clickElement(screen.getByRole("tab", { name: "Bestand" }));
  const dialog = await screen.findByRole("dialog", {
    name: "Ungespeicherte Änderungen",
  });
  await clickElement(
    within(dialog).getByRole("button", { name: "Verwerfen und wechseln" }),
  );
  expect(
    await screen.findByRole("region", { name: "Bestandschargen" }),
  ).toBeInTheDocument();
});
it("rejects an invalid pasted column without changing any cells", async () => {
  stubFetch(routes());
  await renderAppAt("/admin/inventory?view=targets");
  const table = await screen.findByRole("table", { name: "Mindestbestände" });
  const cells = within(table).getAllByRole("textbox");
  const previous = cells.map((cell) => (cell as HTMLInputElement).value);
  fireEvent.paste(cells[0]!, { clipboardData: { getData: () => "5\n-1" } });
  expect(cells.map((cell) => (cell as HTMLInputElement).value)).toEqual(
    previous,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("ganze Zahl");
  expect(
    screen.getByRole("button", { name: "Änderungen speichern" }),
  ).toBeDisabled();
});
