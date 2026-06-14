import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuditService } from "../services/audit.service.js";
import { Roles } from "../auth/auth.decorators.js";

@ApiTags("Audit")
@Roles("ADMIN")
@Controller("audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
    @Query("action") action?: string
  ) {
    return this.audit.list({ entityType, entityId, action });
  }
}
