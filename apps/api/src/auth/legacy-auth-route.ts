const legacyAuthRoutePrefixes = [
  "/2fa",
  "/email-changes",
  "/invitations",
  "/invite",
  "/login",
  "/logout",
  "/password-reset",
  "/preferences",
  "/session",
  "/setup",
  "/users"
];

export function isLegacyAuthRoute(path: string): boolean {
  return legacyAuthRoutePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
