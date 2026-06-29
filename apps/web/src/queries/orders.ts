import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { rescueBaseApi } from "../lib/api";
import { queryStaleTimes } from "./policies";

export const orderKeys = {
  all: ["orders"] as const,
  purchaseDetail: (orderId: string) => [...orderKeys.all, "purchase", orderId] as const,
  purchaseList: () => [...orderKeys.all, "purchase"] as const,
  replenishmentList: () => [...orderKeys.all, "replenishment"] as const
};

export const orderQueries = {
  purchaseDetail: (orderId: string) =>
    queryOptions({ queryKey: orderKeys.purchaseDetail(orderId), queryFn: () => rescueBaseApi.purchaseOrder(orderId), staleTime: queryStaleTimes.detail }),
  purchaseList: () => queryOptions({ queryKey: orderKeys.purchaseList(), queryFn: rescueBaseApi.purchaseOrders, staleTime: queryStaleTimes.live }),
  replenishmentList: () => queryOptions({ queryKey: orderKeys.replenishmentList(), queryFn: rescueBaseApi.orders, staleTime: queryStaleTimes.live })
};

export async function invalidatePurchaseOrder(queryClient: QueryClient, orderId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: orderKeys.purchaseDetail(orderId) }),
    queryClient.invalidateQueries({ queryKey: orderKeys.purchaseList() })
  ]);
}
