import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

Object.defineProperty(window, "scrollTo", {
  configurable: true,
  value: vi.fn()
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
