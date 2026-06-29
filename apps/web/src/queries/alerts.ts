import { queryOptions } from "@tanstack/react-query";
import { getAlertOverview, getAlertSubscriptions, getMyAlertSubscriptions } from "../lib/extra-api";
import { queryStaleTimes } from "./policies";

export const alertKeys = {
  all: ["alerts"] as const,
  overview: () => [...alertKeys.all, "overview"] as const,
  subscriptions: () => [...alertKeys.all, "subscriptions"] as const,
  subscriptionsMe: () => [...alertKeys.subscriptions(), "me"] as const
};

export const alertQueries = {
  overview: () => queryOptions({ queryKey: alertKeys.overview(), queryFn: getAlertOverview, staleTime: queryStaleTimes.live }),
  subscriptions: () => queryOptions({ queryKey: alertKeys.subscriptions(), queryFn: getAlertSubscriptions, staleTime: queryStaleTimes.reference }),
  subscriptionsMe: () => queryOptions({ queryKey: alertKeys.subscriptionsMe(), queryFn: getMyAlertSubscriptions, staleTime: queryStaleTimes.reference })
};
