import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Need } from "./need";
import { catalogFixture, serviceFixture } from "./test-fixtures";
describe("staffing calculator input", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("preserves a Maurer category even when multiple categories share the same factor", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(serviceFixture));
    vi.stubGlobal("fetch", fetch);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Need
          service={serviceFixture}
          catalog={catalogFixture}
          save={vi.fn()}
          locked={false}
        />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Berechnen" }));
    fireEvent.change(screen.getByLabelText("Veranstaltungsart für Maurer"), {
      target: { value: "TRADE_FAIR" },
    });
    expect(screen.getByLabelText("Veranstaltungsart für Maurer")).toHaveValue(
      "TRADE_FAIR",
    );
    fireEvent.submit(screen.getByRole("form", { name: "Maurer: Eingaben" }));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1].body));
    expect(body.input.eventCategory).toBe("TRADE_FAIR");
    expect(body.input.eventFactor).toBe(0.3);
  });
  it("keeps unknown additional rescue capacity empty and rejects invalid factors before submitting", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Need
          service={serviceFixture}
          catalog={catalogFixture}
          save={vi.fn()}
          locked={false}
        />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByLabelText("Berechnungsverfahren"), {
      target: { value: "COLOGNE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Berechnen" }));
    expect(
      screen.getByLabelText(
        "Abgestimmte zusätzliche RTW-Transporte des Regelrettungsdienstes",
      ),
    ).toHaveValue(null);
    fireEvent.change(screen.getByLabelText("Wetterfaktor (1–2)"), {
      target: { value: "5" },
    });
    fireEvent.submit(
      screen.getByRole("form", { name: "Köln: Eingaben und Raumplanung" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Wertebereichs");
    expect(fetch).not.toHaveBeenCalled();
  });
});
