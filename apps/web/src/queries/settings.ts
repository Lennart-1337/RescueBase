import { queryOptions } from "@tanstack/react-query";
import { rescueBaseApi } from "../lib/api";
import { queryStaleTimes } from "./policies";

export const settingsKeys = {
  all: ["settings"] as const,
  admin: () => [...settingsKeys.all, "admin"] as const
};

export const settingsQueries = {
  admin: (enabled = true) => queryOptions({ queryKey: settingsKeys.admin(), queryFn: rescueBaseApi.adminSettings, enabled, staleTime: queryStaleTimes.settings })
};
