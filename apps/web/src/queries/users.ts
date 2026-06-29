import { queryOptions } from "@tanstack/react-query";
import { rescueBaseApi } from "../lib/api";
import { queryStaleTimes } from "./policies";

export const userKeys = {
  all: ["users"] as const,
  list: () => [...userKeys.all, "list"] as const
};

export const userQueries = {
  list: (enabled = true) => queryOptions({ queryKey: userKeys.list(), queryFn: rescueBaseApi.users, enabled, staleTime: queryStaleTimes.reference })
};
