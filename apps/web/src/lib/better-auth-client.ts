import { createAuthClient } from "better-auth/react";
import { adminClient, twoFactorClient } from "better-auth/client/plugins";

export const betterAuthClient = createAuthClient({
  baseURL: "/api/auth",
  plugins: [adminClient(), twoFactorClient()]
});
