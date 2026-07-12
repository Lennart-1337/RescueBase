import type { BrowserPushSubscription } from "./extra-api";

export function supportsBrowserPush() {
  return window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function currentBrowserSubscription() {
  const registration = await navigator.serviceWorker.register("/push-sw.js");
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(publicKey: string): Promise<BrowserPushSubscription> {
  const registration = await navigator.serviceWorker.register("/push-sw.js");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Benachrichtigungen wurden im Browser nicht erlaubt.");
  const subscription = await registration.pushManager.subscribe({ applicationServerKey: decodePublicKey(publicKey), userVisibleOnly: true });
  const keys = subscription.toJSON().keys;
  if (!keys?.auth || !keys.p256dh) throw new Error("Die Browser-Subscription ist unvollständig.");
  return { endpoint: subscription.endpoint, expirationTime: subscription.expirationTime, keys: { auth: keys.auth, p256dh: keys.p256dh } };
}

export function unsubscribeFromPush(subscription: PushSubscription) {
  return subscription.unsubscribe();
}

function decodePublicKey(publicKey: string) {
  const normalized = `${publicKey}${"=".repeat((4 - publicKey.length % 4) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(normalized);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}
