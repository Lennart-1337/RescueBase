import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../../auth/auth.guard.js";
import { ServicesGuard } from "../../auth/services.guard.js";
import { ServiceCatalogService } from "../../services/service-planning/catalog.service.js";
import { rethrowConflict } from "../../services/service-planning/persistence.js";
import type { Input } from "../../services/service-planning/input.js";
@Controller("services")
@UseGuards(ServicesGuard)
export class ServiceCatalogController {
  constructor(private readonly catalogService: ServiceCatalogService) {}
  @Get("catalog") catalog() {
    return this.catalogService.catalog();
  }
  @Post("people") createPerson(
    @Body() body: Input,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.wrap(this.catalogService.savePerson(null, body, r.user!.id));
  }
  @Put("people/:id") person(
    @Param("id") id: string,
    @Body() body: Input,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.wrap(this.catalogService.savePerson(id, body, r.user!.id));
  }
  @Post("vehicles") createVehicle(
    @Body() body: Input,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.wrap(this.catalogService.saveVehicle(null, body, r.user!.id));
  }
  @Put("vehicles/:id") vehicle(
    @Param("id") id: string,
    @Body() body: Input,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.wrap(this.catalogService.saveVehicle(id, body, r.user!.id));
  }
  @Post("tariffs") createTariff(
    @Body() body: Input,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.wrap(this.catalogService.saveTariff(null, body, r.user!.id));
  }
  @Put("tariffs/:id") tariff(
    @Param("id") id: string,
    @Body() body: Input,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.wrap(this.catalogService.saveTariff(id, body, r.user!.id));
  }
  @Post("checklists") createChecklist(
    @Body() body: Input,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.wrap(this.catalogService.saveChecklist(null, body, r.user!.id));
  }
  @Put("checklists/:id") checklist(
    @Param("id") id: string,
    @Body() body: Input,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.wrap(this.catalogService.saveChecklist(id, body, r.user!.id));
  }
  private async wrap<T>(result: Promise<T>) {
    try {
      return await result;
    } catch (error) {
      rethrowConflict(error);
    }
  }
}
