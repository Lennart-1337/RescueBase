import { BadRequestException, Controller, Get, Header, Param, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { ReportService } from "../services/report.service.js";
import { Roles } from "../auth/auth.decorators.js";

@ApiTags("Reports")
@Roles("ADMIN", "WAREHOUSE")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportService) {}

  @Get("csv/inventory")
  @Header("content-type", "text/csv; charset=utf-8")
  inventoryCsv(): Promise<string> {
    return this.reports.inventoryCsv();
  }

  @Get("csv/replenishment")
  @Header("content-type", "text/csv; charset=utf-8")
  replenishmentCsv(): Promise<string> {
    return this.reports.replenishmentCsv();
  }

  @Get("procurement.pdf")
  async procurement(
    @Query("articleId") articleId: string | undefined,
    @Query("locationId") locationId: string | undefined,
    @Query("q") q: string | undefined,
    @Res() response: Response
  ): Promise<void> {
    const pdf = await this.reports.procurementPdf({ articleId, locationId, q });
    response.setHeader("content-type", "application/pdf");
    response.setHeader("content-disposition", "inline; filename=\"beschaffungsliste.pdf\"");
    response.setHeader("cache-control", "no-store, max-age=0");
    response.setHeader("pragma", "no-cache");
    response.setHeader("expires", "0");
    response.send(pdf);
  }

  @Get("qr-label/:kitId.pdf")
  async qrLabel(@Param("kitId") kitId: string, @Query("format") format: string | undefined, @Res() response: Response): Promise<void> {
    if (format && format !== "a4" && format !== "label") {
      throw new BadRequestException("QR-PDF-Format muss a4 oder label sein.");
    }
    const pdf = await this.reports.qrLabelPdf(kitId, (format ?? "a4") as "a4" | "label");
    response.setHeader("content-type", "application/pdf");
    response.setHeader("content-disposition", `inline; filename="qr-${kitId}.pdf"`);
    response.setHeader("cache-control", "no-store, max-age=0");
    response.setHeader("pragma", "no-cache");
    response.setHeader("expires", "0");
    response.send(pdf);
  }

  @Get("replenishment/:orderId.pdf")
  async replenishment(@Param("orderId") orderId: string, @Res() response: Response): Promise<void> {
    const pdf = await this.reports.replenishmentPdf(orderId);
    response.setHeader("content-type", "application/pdf");
    response.setHeader("content-disposition", `inline; filename="auftrag-${orderId}.pdf"`);
    response.setHeader("cache-control", "no-store, max-age=0");
    response.setHeader("pragma", "no-cache");
    response.setHeader("expires", "0");
    response.send(pdf);
  }
}
