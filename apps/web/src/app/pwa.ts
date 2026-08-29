const serviceWorkerUrl = "/push-sw.js";

export function registerAppServiceWorker(isProduction = import.meta.env.PROD) {
  if (!isProduction || !window.isSecureContext || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register(serviceWorkerUrl, { scope: "/" }).catch(() => undefined);
}
