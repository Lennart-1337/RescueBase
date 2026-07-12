export type PushMessage = {
  body: string;
  tag: string;
  title: string;
  url: string;
};

export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { auth: string; p256dh: string };
};
