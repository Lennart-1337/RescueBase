import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../../auth/auth.guard.js";
import { ServicesGuard } from "../../auth/services.guard.js";
import { ServiceEventsService } from "../../services/service-planning/events.service.js";
import { ServiceCalculationsService } from "../../services/service-planning/calculations.service.js";
import type { Input } from "../../services/service-planning/input.js";
@Controller("services")
@UseGuards(ServicesGuard)
export class ServiceEventsController {
  constructor(
    private readonly events: ServiceEventsService,
    private readonly calculations: ServiceCalculationsService,
  ) {}
  @Get() list(@Query() query: Input) {
    return this.events.list(query);
  }
  @Post() create(@Body() body: Input, @Req() req: AuthenticatedRequest) {
    return this.events.save(null, body, req.user!.id);
  }
  @Get(":id") detail(@Param("id") id: string) {
    return this.events.detail(id);
  }
  @Put(":id") save(
    @Param("id") id: string,
    @Body() body: Input,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.events.save(id, body, req.user!.id);
  }
  @Delete(":id") remove(
    @Param("id") id: string,
    @Body() body: Input,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.events.remove(id, body, req.user!.id);
  }
  @Post(":id/transition") transition(
    @Param("id") id: string,
    @Body() body: Input,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.events.transition(id, body, req.user!.id);
  }
  @Post(":id/calculations") calculate(
    @Param("id") id: string,
    @Body() body: Input,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.calculations.create(id, body, req.user!.id);
  }
}
