import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { PublicLegalLayout } from "./public-legal-layout";
import { ThemeProvider } from "./theme";

vi.mock("./legal-links", () => ({ LegalLinks: () => <nav aria-label="Rechtliches" /> }));

describe("PublicLegalLayout", () => {
  it("keeps the heading and theme toggle as separate header elements", () => {
    render(
      <ThemeProvider>
        <PublicLegalLayout title="Impressum"><p>Inhalt</p></PublicLegalLayout>
      </ThemeProvider>
    );

    expect(screen.getByText("RescueBase").closest(".public-legal-heading")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Farbmodus" })).toHaveClass("public-theme-toggle");
  });
});
