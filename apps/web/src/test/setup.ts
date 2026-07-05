import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

const mediaQueryState = new Map<string, { listeners: Set<(event: MediaQueryListEvent) => void>; matches: boolean }>();

Object.defineProperty(window, "scrollTo", {
  configurable: true,
  value: vi.fn()
});

function readMediaQueryState(query: string) {
  const existing = mediaQueryState.get(query);
  if (existing) return existing;
  const created = { listeners: new Set<(event: MediaQueryListEvent) => void>(), matches: false };
  mediaQueryState.set(query, created);
  return created;
}

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: vi.fn((query: string) => {
    const state = readMediaQueryState(query);
    return {
      addEventListener: vi.fn((eventName: string, listener: (event: MediaQueryListEvent) => void) => {
        if (eventName === "change") state.listeners.add(listener);
      }),
      dispatchEvent: vi.fn(),
      get matches() {
        return state.matches;
      },
      media: query,
      onchange: null,
      removeEventListener: vi.fn((eventName: string, listener: (event: MediaQueryListEvent) => void) => {
        if (eventName === "change") state.listeners.delete(listener);
      })
    };
  })
});

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: vi.fn(() =>
    new Proxy(
      {},
      {
        get(target, property) {
          if (!(property in target)) {
            Reflect.set(target, property, vi.fn());
          }
          return Reflect.get(target, property);
        },
        set(target, property, value) {
          Reflect.set(target, property, value);
          return true;
        }
      }
    )
  )
});

Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
  configurable: true,
  value: vi.fn(() => "data:image/png;base64,test-signature")
});

export function setReducedMotionForTests(enabled: boolean) {
  setMediaQueryForTests("(prefers-reduced-motion: reduce)", enabled);
}

export function setSystemDarkModeForTests(enabled: boolean) {
  setMediaQueryForTests("(prefers-color-scheme: dark)", enabled);
}

function setMediaQueryForTests(query: string, enabled: boolean) {
  const state = readMediaQueryState(query);
  state.matches = enabled;
  const event = { matches: enabled, media: query } as MediaQueryListEvent;
  state.listeners.forEach((listener) => listener(event));
}
