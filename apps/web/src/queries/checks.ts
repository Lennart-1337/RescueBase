import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { rescueBaseApi } from "../lib/api";
import { queryStaleTimes } from "./policies";

export type CheckProtocolQuery = { kitId?: string; page?: string; q?: string; status?: string };

export const checkKeys = {
  all: ["checks"] as const,
  detail: (id: string) => [...checkKeys.all, id] as const,
  protocols: (query: CheckProtocolQuery) => [...checkKeys.all, "protocols", query] as const
};

export const checkQueries = {
  detail: (id: string, enabled: boolean) =>
    queryOptions({ queryKey: checkKeys.detail(id), queryFn: () => rescueBaseApi.checkProtocol(id), enabled, staleTime: queryStaleTimes.detail }),
  protocols: (query: CheckProtocolQuery) =>
    queryOptions({
      queryKey: checkKeys.protocols(query),
      queryFn: () => rescueBaseApi.checkProtocols(query),
      placeholderData: keepPreviousData,
      staleTime: queryStaleTimes.live
    })
};
