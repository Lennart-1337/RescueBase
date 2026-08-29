import { fireEvent, render, screen } from "@testing-library/react";
import { RouteErrorPage } from "./route-error-page";

describe("RouteErrorPage", () => {
  it("retries an unexpected route error", () => {
    const reset = vi.fn();

    render(<RouteErrorPage error={new Error("Nicht erreichbar")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));

    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Diese Ansicht konnte nicht geladen werden." })).toBeInTheDocument();
  });

  it("reveals and starts the hidden delivery game after three clicks on the error code", () => {
    render(<RouteErrorPage kind="not-found" />);
    const code = screen.getByRole("button", { name: "Interne Inventurnummer 404" });
    fireEvent.click(code);
    fireEvent.click(code);
    fireEvent.click(code);

    expect(screen.getByRole("heading", { name: "Packwagen-Express" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Spiel starten" }));
    expect(screen.getByText("Fehlwürfe: 0/3")).toBeInTheDocument();
  });

  it("opens the night-shift archive after its secret keyboard sequence", () => {
    render(<RouteErrorPage kind="not-found" />);

    ["n", "a", "c", "h", "t"].forEach((key) => fireEvent.keyDown(window, { key }));

    expect(screen.getByRole("heading", { name: "Nachtschicht-Kartei" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nächsten Fund blättern" })).toBeInTheDocument();
  });
});
