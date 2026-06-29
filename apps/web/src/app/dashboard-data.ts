import { useQuery } from "@tanstack/react-query";
import type { Batch } from "../lib/types";
import { catalogQueries } from "../queries/catalog";
import { inventoryQueries } from "../queries/inventory";
import { orderQueries } from "../queries/orders";

export function useDashboardData() {
  const kits = useQuery(catalogQueries.kits());
  const batches = useQuery(inventoryQueries.batches());
  const orders = useQuery(orderQueries.replenishmentList());

  return {
    data: kits.data && batches.data && orders.data ? { kits: kits.data, batches: batches.data, orders: orders.data } : undefined,
    error: kits.error ?? batches.error ?? orders.error,
    isError: kits.isError || batches.isError || orders.isError,
    isLoading: kits.isLoading || batches.isLoading || orders.isLoading,
    refetch: async () => {
      await Promise.all([kits.refetch(), batches.refetch(), orders.refetch()]);
    }
  };
}

export function selectedBatchQuantity(batches: Batch[], batchId: string): number {
  return batches.find((batch) => batch.id === batchId)?.quantity ?? 0;
}
