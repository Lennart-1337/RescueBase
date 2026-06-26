import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/auth.decorators.js";
import type { AuthenticatedRequest } from "../auth/auth.guard.js";
import { PurchaseOrdersService } from "../services/purchase-orders.service.js";

@ApiTags("Bestellungen")
@Roles("ADMIN", "WAREHOUSE")
@Controller("purchase-orders")
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrders: PurchaseOrdersService) {}

  @Get()
  list() {
    return this.purchaseOrders.list();
  }

  @Post()
  create(@Body() body: {
    supplierName: string;
    locationId: string;
    notes?: string;
    lines: Array<{ articleId: string; orderedQuantity: number; grossUnitPriceCents?: number; note?: string; supplierArticleNumber?: string }>;
  }) {
    return this.purchaseOrders.createDraft(body);
  }

  @Post("from-shortages")
  createFromShortages(@Body() body: {
    locationId: string;
    groupingMode: "single" | "supplier";
    supplierName?: string;
    articleIds?: string[];
  }) {
    return this.purchaseOrders.createFromShortages(body);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.purchaseOrders.get(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: {
    supplierName?: string;
    locationId?: string;
    notes?: string;
    lines?: Array<{ articleId: string; orderedQuantity: number; grossUnitPriceCents?: number; note?: string; supplierArticleNumber?: string }>;
    lineNotes?: Array<{ lineId: string; note?: string }>;
  }) {
    return this.purchaseOrders.update(id, body);
  }

  @Post(":id/approve")
  @Roles("ADMIN")
  approve(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.purchaseOrders.approve(id, request.user!);
  }

  @Post(":id/order")
  markOrdered(@Param("id") id: string) {
    return this.purchaseOrders.markOrdered(id);
  }

  @Post(":id/receive")
  receive(@Param("id") id: string, @Body() body: {
    lines: Array<{
      lineId: string;
      batches: Array<{ lotNumber: string; expiresAt: string; quantity: number }>;
    }>;
  }) {
    return this.purchaseOrders.receive(id, body);
  }
}
