import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { Devices } from "./devices";
import { mpgTabs } from "./mpg-page";

describe("MPG page structure", () => {
  it("places devices and models in separate top-level tabs", () => {
    expect(mpgTabs.map(tab => tab.value)).toEqual(["devices", "models", "deadlines", "trainings", "people", "cylinders"]);
  });

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

  it("keeps model management out of the device tab", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><Devices catalog={{ kits: [], locations: [], models: [], people: [], users: [] }} devices={[]} /></QueryClientProvider>);
    expect(screen.queryByRole("button", { name: "Modelle verwalten" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Modelle und Prüfanforderungen" })).not.toBeInTheDocument();
  });
});
