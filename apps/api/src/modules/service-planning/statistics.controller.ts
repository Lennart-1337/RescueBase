import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { ServicesGuard } from "../../auth/services.guard.js";
import { ServiceStatisticsService } from "../../services/service-planning/statistics.service.js";
import type { Input } from "../../services/service-planning/input.js";
@Controller("services")
@UseGuards(ServicesGuard)
export class ServiceStatisticsController {
  constructor(private readonly statisticsService: ServiceStatisticsService) {}
  @Get("statistics") statistics(@Query() query: Input) {
    return this.statisticsService.statistics(query);
  }
  @Get("statistics.csv") async csv(
    @Query() query: Input,
    @Res() response: Response,
  ) {
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="dienststatistik.csv"',
    );
    response.setHeader("Cache-Control", "private, no-store");
    response.send(await this.statisticsService.csv(query));
  }
}
