import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/auth.guard.js";
import { ServicesGuard } from "../../auth/services.guard.js";
import { ServiceBillingDocumentsService } from "../../services/service-planning/billing/documents.service.js";
import type { Input } from "../../services/service-planning/input.js";
@Controller("services/:id/billing-documents")
@UseGuards(ServicesGuard)
export class ServiceBillingDocumentsController {
  constructor(private readonly billing: ServiceBillingDocumentsService) {}
  @Post()
  async create(
    @Param("id") id: string,
    @Body() body: Input,
    @Req() req: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const { filename, buffer } = await this.billing.create(
      id,
      body,
      req.user!.id,
    );
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    response.send(buffer);
  }
}
