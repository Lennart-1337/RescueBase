import { createContext, startTransition, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "../components/ui";
import "./theme-toggle.css";

export const THEME_STORAGE_KEY = "rescuebase-theme";
const DARK_THEME_QUERY = "(prefers-color-scheme: dark)";
const THEME_META_COLORS = { dark: "#0d1117", light: "#f6f8fa" } as const;

type ThemePreference = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";
type ThemeContextValue = { preference: ThemePreference; resolvedTheme: ResolvedTheme; setPreference: (theme: ThemePreference) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredThemePreference());
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => window.matchMedia(DARK_THEME_QUERY).matches);
  const resolvedTheme = preference === "system" ? (systemPrefersDark ? "dark" : "light") : preference;

  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_THEME_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themeMode = preference;
    document.documentElement.style.colorScheme = resolvedTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_META_COLORS[resolvedTheme]);
  }, [preference, resolvedTheme]);

  return (
    <ThemeContext.Provider
      value={{ preference, resolvedTheme, setPreference: (theme) => startTransition(() => setPreferenceState(theme)) }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const options = [
    { icon: Sun, label: "Hell", value: "light" },
    { icon: Moon, label: "Dunkel", value: "dark" },
    { icon: Monitor, label: "System", value: "system" }
  ] as const;

  return (
    <div aria-label="Farbmodus" className={cn("theme-toggle", className)} data-theme-resolved={resolvedTheme} role="group">
      {options.map(({ icon: Icon, label, value }) => (
        <button
          aria-pressed={preference === value}
          className={cn("theme-toggle-option", preference === value && "theme-toggle-option-active")}
          key={value}
          onClick={() => setPreference(value)}
          type="button"
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider.");
  return context;
}

function readStoredThemePreference(): ThemePreference {
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}
