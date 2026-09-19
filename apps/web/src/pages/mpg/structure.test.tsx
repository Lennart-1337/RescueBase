import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { Devices } from "./devices";

describe("MPG page structure", () => {
  it("opens device creation in a standard dialog without disclosure forms", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><Devices catalog={{ kits: [], locations: [], models: [], people: [], users: [] }} devices={[]} /></QueryClientProvider>);
    expect(screen.queryByText("Gerät erfassen", { selector: "summary" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Modelle und Prüfanforderungen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "CSV" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerät erfassen" }));
    expect(screen.getByRole("dialog", { name: "Gerät erfassen" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Artikel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Zuständige Person")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Loscode")).toBeInTheDocument();
  });

  it("opens models from the device area only on request", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><Devices catalog={{ kits: [], locations: [], models: [], people: [], users: [] }} devices={[]} /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Modelle verwalten" }));
    expect(screen.getByRole("heading", { name: "Modelle und Prüfanforderungen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zurück zu Geräten" }));
    expect(screen.queryByRole("heading", { name: "Modelle und Prüfanforderungen" })).not.toBeInTheDocument();
  });
});
