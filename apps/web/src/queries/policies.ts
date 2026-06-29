export const queryStaleTimes = {
  auth: 30_000,
  detail: 30_000,
  live: 5_000,
  reference: 5 * 60_000,
  settings: 60_000
} as const;
