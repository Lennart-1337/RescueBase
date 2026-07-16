import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { rescueBaseApi } from "../lib/api";
import { queryStaleTimes } from "./policies";

export const inventoryKeys = {
  all: ["inventory"] as const,
  batches: () => [...inventoryKeys.all, "batches"] as const,
  batchMovements: (batchId: string | null) => [...inventoryKeys.batches(), batchId, "movements"] as const,
  targets: () => [...inventoryKeys.all, "targets"] as const
};

export const inventoryQueries = {
  batches: () => queryOptions({ queryKey: inventoryKeys.batches(), queryFn: rescueBaseApi.batches, staleTime: queryStaleTimes.live }),
  batchMovements: (batchId: string | null, enabled: boolean) =>
    queryOptions({
      queryKey: inventoryKeys.batchMovements(batchId),
      queryFn: () => rescueBaseApi.batchMovements(batchId ?? ""),
      enabled,
      staleTime: queryStaleTimes.detail
    }),
  targets: () => queryOptions({ queryKey: inventoryKeys.targets(), queryFn: rescueBaseApi.inventoryTargets, staleTime: queryStaleTimes.live })
};

export async function invalidateInventoryPlanning(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: inventoryKeys.batches() }),
    queryClient.invalidateQueries({ queryKey: inventoryKeys.targets() }),
  ]);
}
