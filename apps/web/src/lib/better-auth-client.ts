import { createAuthClient } from "better-auth/client";
import { adminClient, twoFactorClient } from "better-auth/client/plugins";

export const betterAuthClient = createAuthClient({
  baseURL: `${window.location.origin}/api/auth`,
  plugins: [adminClient(), twoFactorClient()]
});
