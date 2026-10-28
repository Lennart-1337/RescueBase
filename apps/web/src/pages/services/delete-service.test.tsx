import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DeleteService } from "./delete-service";
import { serviceFixture } from "./test-fixtures";
function setup() {
  const onDeleted = vi.fn();
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(["services", "/service-1"], serviceFixture);
  render(<QueryClientProvider client={client}>
    <DeleteService service={serviceFixture} onDeleted={onDeleted} />
  </QueryClientProvider>);
  return { onDeleted, client };
}
afterEach(() => vi.unstubAllGlobals());
it("requires confirmation, sends the current version and clears the deleted detail", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ id: serviceFixture.id }));
  vi.stubGlobal("fetch", fetch);
  const { onDeleted, client } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Dienst löschen" }));
  await waitFor(() => expect(screen.getByRole("dialog", { name: "Dienst löschen?" })).toBeVisible());
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
  expect(onDeleted).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Dienst löschen" }));
  fireEvent.click(screen.getByRole("button", { name: "Löschen bestätigen" }));
  await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
  expect(fetch).toHaveBeenCalledWith("/api/services/service-1", expect.objectContaining({
    method: "DELETE", body: JSON.stringify({ version: serviceFixture.version }),
  }));
  expect(client.getQueryData(["services", "/service-1"])).toBeUndefined();
});
it("keeps the dialog open and displays a concurrent edit error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "Der Dienst wurde zwischenzeitlich geändert." }, { status: 409 })));
  const { onDeleted } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Dienst löschen" }));
  fireEvent.click(screen.getByRole("button", { name: "Löschen bestätigen" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("zwischenzeitlich geändert");
  expect(onDeleted).not.toHaveBeenCalled();
});
