import { isLegacyAuthRoute } from "../src/auth/legacy-auth-route.js";

describe("isLegacyAuthRoute", () => {
  it.each(["/setup/status", "/login", "/users/user-1/active"])("routes %s to the legacy controller", (path) => {
    expect(isLegacyAuthRoute(path)).toBe(true);
  });

  it.each(["/get-session", "/sign-in/email", "/two-factor/verify-totp"])("routes %s to Better Auth", (path) => {
    expect(isLegacyAuthRoute(path)).toBe(false);
  });
});
