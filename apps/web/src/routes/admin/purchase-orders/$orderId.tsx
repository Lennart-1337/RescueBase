import { createFileRoute } from "@tanstack/react-router";
import { preloadAdminQueries } from "../../../app/route-preload";
import { PurchaseOrderDetailPage } from "../../../pages/purchase-order-detail-page";
import { orderQueries } from "../../../queries/orders";

export const Route = createFileRoute("/admin/purchase-orders/$orderId")({
  loader: ({ context, params }) =>
    preloadAdminQueries(context.queryClient, () =>
      Promise.all([
        context.queryClient.prefetchQuery(orderQueries.purchaseDetail(params.orderId))
      ])
    ),
  component: PurchaseOrderDetailRoute
});

function PurchaseOrderDetailRoute() {
  return <PurchaseOrderDetailPage />;
}
