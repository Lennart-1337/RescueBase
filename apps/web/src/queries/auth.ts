import { queryOptions } from "@tanstack/react-query";
import { rescueBaseApi } from "../lib/api";
import { betterAuthClient } from "../lib/better-auth-client";
import { queryStaleTimes } from "./policies";

type RescueBaseSessionUser = {
  id: string;
  email: string;
  name: string;
  role?: string | null;
  twoFactorEnabled?: boolean | null;
  newOrderNotificationsEnabled?: boolean | null;
};

export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
  setupStatus: () => [...authKeys.all, "setup-status"] as const
};

export const authQueries = {
  session: (enabled = true) => queryOptions({ queryKey: authKeys.session(), queryFn: getSession, enabled, staleTime: queryStaleTimes.auth }),
  setupStatus: () => queryOptions({ queryKey: authKeys.setupStatus(), queryFn: rescueBaseApi.setupStatus, staleTime: queryStaleTimes.settings })
};

async function getSession() {
  const { data, error } = await betterAuthClient.getSession();
  if (error) throw error;
  if (!data) return null;
  const user = data.user as RescueBaseSessionUser;
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.name,
      role: user.role === "ADMIN" ? "ADMIN" as const : "WAREHOUSE" as const,
      twoFactorEnabled: user.twoFactorEnabled === true,
      newOrderNotificationsEnabled: user.newOrderNotificationsEnabled === true
    }
  };
}
