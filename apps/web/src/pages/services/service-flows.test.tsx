import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ServiceList } from "./service-list";
import { ServiceDetail } from "./service-detail";
import { Need } from "./need";
import { catalogFixture, serviceFixture } from "./test-fixtures";
import { serviceRequest } from "./api";
function withQueries(node: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {node}
    </QueryClientProvider>,
  );
}
function mockApi() {
  const fetch = vi.fn(
    async (url: string | URL | Request, options?: RequestInit) => {
      const path = String(url);
      if (options?.method === "POST" || options?.method === "PUT")
        return Response.json(serviceFixture);
      return Response.json(
        path.endsWith("/catalog")
          ? catalogFixture
          : path.endsWith("/service-1")
            ? serviceFixture
            : [serviceFixture],
      );
    },
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
describe("service planning flows", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("loads the service list without unrelated catalog data and opens the selected service", async () => {
    const fetch = mockApi();
    const onSelect = vi.fn();
    withQueries(<ServiceList onSelect={onSelect} />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Sanitätsdienst Stadtlauf/ }),
    );
    expect(onSelect).toHaveBeenCalledWith("service-1");
    expect(
      fetch.mock.calls.some(([url]) => String(url).includes("catalog")),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Dienst anlegen" }));
    expect(
      await screen.findByRole("form", { name: "Neuen Sanitätsdienst anlegen" }),
    ).toBeInTheDocument();
    expect(
      fetch.mock.calls.some(([url]) => String(url).includes("catalog")),
    ).toBe(true);
  });
  it("sends incomplete calculation input explicitly without invented false or zero defaults", async () => {
    const fetch = mockApi();
    withQueries(
      <Need
        service={serviceFixture}
        catalog={catalogFixture}
        locked={false}
        save={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Berechnen" }));
    expect(screen.getByLabelText("Veranstaltung im Gebäude")).toHaveValue("");
    expect(
      screen.getByLabelText("Polizeiliche Erkenntnisse zu Gewaltbereitschaft"),
    ).toHaveValue("");
    fireEvent.submit(screen.getByRole("form", { name: "Maurer: Eingaben" }));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [, request] = fetch.mock.calls[0]!;
    expect(JSON.parse(String(request?.body))).toEqual({
      version: 3,
      method: "MAURER",
      input: {},
      reason: "",
    });
  });
  it("shows a closed service read-only and requires reopening before a new calculation", async () => {
    const fetch = mockApi();
    fetch.mockImplementation(async (url) =>
      Response.json(
        String(url).endsWith("/catalog")
          ? catalogFixture
          : { ...serviceFixture, status: "COMPLETED" },
      ),
    );
    withQueries(
      <ServiceDetail
        id="service-1"
        tab="need"
        onBack={vi.fn()}
        onTab={vi.fn()}
      />,
    );
    expect(
      await screen.findByRole("button", { name: "Berechnen" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Schreibgeschützt")).toBeInTheDocument();
  });
  it("preserves server conflict messages so concurrent edits can be resolved", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            message:
              "Der Dienst wurde zwischenzeitlich geändert. Bitte neu laden.",
          },
          { status: 409 },
        ),
      ),
    );
    await expect(
      serviceRequest("/service-1", { version: 1 }, "PUT"),
    ).rejects.toThrow("zwischenzeitlich geändert");
  });
});
