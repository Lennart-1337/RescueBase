import { registerAppServiceWorker } from "./pwa";

describe("registerAppServiceWorker", () => {
  it("registers the shared app and push service worker when available", () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register } });
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });

    registerAppServiceWorker(true);

    expect(register).toHaveBeenCalledWith("/push-sw.js", { scope: "/" });
  });

  it("does not register a service worker in development", () => {
    const register = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register } });
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });

    registerAppServiceWorker(false);

    expect(register).not.toHaveBeenCalled();
  });
});
