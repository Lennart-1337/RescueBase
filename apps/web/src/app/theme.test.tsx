import { act, fireEvent, render, screen } from "@testing-library/react";
import { setSystemDarkModeForTests } from "../test/setup";
import { THEME_STORAGE_KEY, ThemeProvider, ThemeToggle, useTheme } from "./theme";

describe("theme system", () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-mode");
    document.documentElement.style.colorScheme = "";
    setSystemDarkModeForTests(false);
  });

  it("defaults to the system preference", async () => {
    setSystemDarkModeForTests(true);

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(await screen.findByText("system:dark")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveAttribute("data-theme-mode", "system");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("persists an explicit dark selection", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Dunkel" }));

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(screen.getByRole("button", { name: "Dunkel" })).toHaveAttribute("aria-pressed", "true");
  });

  it("returns to system mode and follows later OS changes", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Hell" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    fireEvent.click(screen.getByRole("button", { name: "System" }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");

    act(() => setSystemDarkModeForTests(true));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(screen.getByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "true");
  });
});

function ThemeProbe() {
  const { preference, resolvedTheme } = useTheme();
  return <span>{`${preference}:${resolvedTheme}`}</span>;
}
