import { createFileRoute } from "@tanstack/react-router";
import { PurchaseOrderDetailPage } from "../../../pages/purchase-order-detail-page";

export const Route = createFileRoute("/admin/purchase-orders/$orderId")({
  component: PurchaseOrderDetailRoute
});

function PurchaseOrderDetailRoute() {
  return <PurchaseOrderDetailPage />;
}
