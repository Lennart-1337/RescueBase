import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/auth.guard.js";
import { MpgGuard } from "../auth/mpg.guard.js";
import { MpgNotificationsService } from "../mpg-notifications/mpg-notifications.service.js";
import { MpgCylindersService } from "./mpg-cylinders.service.js";
import { MpgDevicesService } from "./mpg-devices.service.js";
import { MpgInspectionsService } from "./mpg-inspections.service.js";
import { MpgModelsService } from "./mpg-models.service.js";
import { MpgOperationsService } from "./mpg-operations.service.js";
import { MpgPeopleService } from "./mpg-people.service.js";
import { MpgTrainingsService } from "./mpg-trainings.service.js";
import type { Input } from "./mpg.validation.js";

@Controller("mpg")
@UseGuards(MpgGuard)
export class MpgController {
  constructor(private readonly models: MpgModelsService, private readonly devices: MpgDevicesService,
    private readonly inspections: MpgInspectionsService, private readonly people: MpgPeopleService,
    private readonly trainings: MpgTrainingsService, private readonly operations: MpgOperationsService,
    private readonly cylinders: MpgCylindersService, private readonly notifications: MpgNotificationsService) {}

  @Get("models") modelsList() { return this.models.list(); }
  @Post("models") modelsCreate(@Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.models.save(null, b, actor(r))); }
  @Patch("models/:id") modelsUpdate(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.models.save(id, b, actor(r))); }
  @Post("models/:id/requirements") requirement(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.models.requirement(id, b, actor(r))); }
  @Post("models/:id/review") modelReview(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.models.review(id, b, actor(r))); }

  @Get("devices") devicesList() { return this.devices.list(); }
  @Get("devices/:id") device(@Param("id") id: string) { return this.devices.get(id); }
  @Post("devices") deviceCreate(@Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.devices.save(null, b, actor(r))); }
  @Patch("devices/:id") deviceUpdate(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.devices.save(id, b, actor(r))); }
  @Post("devices/:id/release") deviceRelease(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.devices.action(id, b, actor(r), false)); }
  @Post("devices/:id/retire") deviceRetire(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.devices.action(id, b, actor(r), true)); }

  @Post("devices/:id/inspections") inspectionCreate(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.inspections.save(id, null, b, actor(r))); }
  @Patch("inspections/:id") inspectionUpdate(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.inspections.update(id, b, actor(r))); }
  @Post("inspections/:id/correct") inspectionCorrect(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.inspections.update(id, b, actor(r), true)); }
  @Post("inspections/:id/finalize") inspectionFinalize(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.inspections.finalize(id, b, actor(r))); }

  @Get("people") peopleList() { return this.people.list(); }
  @Post("people") personCreate(@Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.people.save(null, b, actor(r))); }
  @Patch("people/:id") personUpdate(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.people.save(id, b, actor(r))); }

  @Get("trainings") trainingList() { return this.trainings.list(); }
  @Get("trainings/:id") training(@Param("id") id: string) { return this.trainings.get(id); }
  @Post("trainings") trainingCreate(@Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.trainings.create(b, actor(r))); }
  @Post("trainings/:id/confirm") trainingConfirm(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.trainings.confirm(id, b, actor(r))); }
  @Post("trainings/:id/finalize") trainingFinalize(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.trainings.finalize(id, b, actor(r))); }

  @Post("devices/:id/glucose-controls") glucose(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.operations.glucose(id, b, actor(r))); }
  @Post("glucose-controls/:id/resolve") glucoseResolve(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.operations.resolveGlucose(id, b, actor(r))); }
  @Post("devices/:id/incidents") incident(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.operations.incident(id, b, actor(r))); }
  @Patch("incidents/:id") incidentUpdate(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.operations.updateIncident(id, b, actor(r))); }

  @Get("cylinders") cylindersList() { return this.cylinders.list(); }
  @Post("cylinders") cylinderCreate(@Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.cylinders.save(null, b, actor(r))); }
  @Patch("cylinders/:id") cylinderUpdate(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.cylinders.save(id, b, actor(r))); }
  @Post("cylinders/:id/assign") cylinderAssign(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.cylinders.assign(id, b, actor(r))); }
  @Post("cylinders/:id/return") cylinderReturn(@Param("id") id: string, @Body() b: Input, @Req() r: AuthenticatedRequest) { return this.changed(this.cylinders.return(id, b, actor(r))); }

  private async changed<T>(operation: Promise<T>) {
    const result = await operation;
    void this.notifications.scan().catch(() => undefined);
    return result;
  }
}

function actor(request: AuthenticatedRequest) { return request.user!.id; }
