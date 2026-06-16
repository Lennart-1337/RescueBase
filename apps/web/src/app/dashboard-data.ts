import { useQuery } from "@tanstack/react-query";
import { rescueBaseApi } from "../lib/api";
import type { Batch } from "../lib/types";

export function useDashboardData() {
  const kits = useQuery({ queryKey: ["kits"], queryFn: rescueBaseApi.kits });
  const batches = useQuery({ queryKey: ["batches"], queryFn: rescueBaseApi.batches });
  const orders = useQuery({ queryKey: ["orders"], queryFn: rescueBaseApi.orders });

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
