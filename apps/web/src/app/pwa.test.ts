import { registerAppServiceWorker } from "./pwa";

describe("registerAppServiceWorker", () => {
  it("registers the shared app and push service worker when available", () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register } });
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });

    registerAppServiceWorker();

    expect(register).toHaveBeenCalledWith("/push-sw.js", { scope: "/" });
  });
});
