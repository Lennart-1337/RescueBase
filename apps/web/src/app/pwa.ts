const serviceWorkerUrl = "/push-sw.js";

export function registerAppServiceWorker() {
  if (!window.isSecureContext || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register(serviceWorkerUrl, { scope: "/" }).catch(() => undefined);
}
