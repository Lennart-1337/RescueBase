import { queryOptions } from "@tanstack/react-query";
import { rescueBaseApi } from "../lib/api";
import { queryStaleTimes } from "./policies";

export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
  setupStatus: () => [...authKeys.all, "setup-status"] as const
};

export const authQueries = {
  session: (enabled = true) => queryOptions({ queryKey: authKeys.session(), queryFn: rescueBaseApi.session, enabled, staleTime: queryStaleTimes.auth }),
  setupStatus: () => queryOptions({ queryKey: authKeys.setupStatus(), queryFn: rescueBaseApi.setupStatus, staleTime: queryStaleTimes.settings })
};
