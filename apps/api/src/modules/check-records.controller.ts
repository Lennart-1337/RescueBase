import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/auth.decorators.js";
import { CheckRecordsService } from "../services/check-records.service.js";

@ApiTags("Check-Protokolle")
@Roles("ADMIN", "WAREHOUSE")
@Controller("checks")
export class CheckRecordsController {
  constructor(private readonly checks: CheckRecordsService) {}

  @Get()
  list(@Query("q") q?: string, @Query("kitId") kitId?: string, @Query("status") status?: string, @Query("page") page?: string) {
    return this.checks.list({ q, kitId, status, page });
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.checks.detail(id);
  }
}
