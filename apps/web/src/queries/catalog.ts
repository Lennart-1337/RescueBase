import { queryOptions } from "@tanstack/react-query";
import { rescueBaseApi } from "../lib/api";
import { queryStaleTimes } from "./policies";

export const catalogKeys = {
  all: ["catalog"] as const,
  articles: () => [...catalogKeys.all, "articles"] as const,
  suppliers: () => [...catalogKeys.all, "suppliers"] as const,
  kits: () => [...catalogKeys.all, "kits"] as const,
  locations: () => [...catalogKeys.all, "locations"] as const,
  templates: () => [...catalogKeys.all, "templates"] as const
};

export const catalogQueries = {
  articles: (enabled = true) => queryOptions({ queryKey: catalogKeys.articles(), queryFn: rescueBaseApi.articles, enabled, staleTime: queryStaleTimes.reference }),
  suppliers: (enabled = true) => queryOptions({ queryKey: catalogKeys.suppliers(), queryFn: rescueBaseApi.suppliers, enabled, staleTime: queryStaleTimes.reference }),
  kits: (enabled = true) => queryOptions({ queryKey: catalogKeys.kits(), queryFn: rescueBaseApi.kits, enabled, staleTime: queryStaleTimes.reference }),
  locations: (enabled = true) => queryOptions({ queryKey: catalogKeys.locations(), queryFn: rescueBaseApi.locations, enabled, staleTime: queryStaleTimes.reference }),
  templates: (enabled = true) => queryOptions({ queryKey: catalogKeys.templates(), queryFn: rescueBaseApi.templates, enabled, staleTime: queryStaleTimes.reference })
};
