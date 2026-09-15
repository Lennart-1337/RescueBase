import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { Devices } from "./devices";

describe("MPG page structure", () => {
  it("opens device creation in a standard dialog without disclosure forms", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><Devices catalog={{ articles: [], kits: [], locations: [], models: [], people: [] }} devices={[]} /></QueryClientProvider>);
    expect(screen.queryByText("Gerät erfassen", { selector: "summary" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerät erfassen" }));
    expect(screen.getByRole("dialog", { name: "Gerät erfassen" })).toBeInTheDocument();
  });
});
