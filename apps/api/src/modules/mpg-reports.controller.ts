import { Controller, Get, Param, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { MpgGuard } from "../auth/mpg.guard.js";
import { MpgReportsService } from "../services/mpg-reports.service.js";

@Controller("mpg/exports")
@UseGuards(MpgGuard)
export class MpgReportsController {
  constructor(private readonly reports: MpgReportsService) {}
  @Get("inventory.pdf") async inventory(@Res() r: Response) { send(r, await this.reports.inventory(), "application/pdf", "bestandsverzeichnis.pdf"); }
  @Get("devices/:id.pdf") async device(@Param("id") id: string, @Res() r: Response) { send(r, await this.reports.deviceBook(id), "application/pdf", "medizinproduktebuch.pdf"); }
  @Get("devices/:id.zip") async archive(@Param("id") id: string, @Res() r: Response) { send(r, await this.reports.archive(id), "application/zip", "geraeteakte.zip"); }
  @Get("devices/:id/label.pdf") async label(@Param("id") id: string, @Res() r: Response) { send(r, await this.reports.label(id), "application/pdf", "geraeteetikett.pdf"); }
  @Get("trainings/:id.pdf") async training(@Param("id") id: string, @Res() r: Response) { send(r, await this.reports.training(id), "application/pdf", "einweisungsnachweis.pdf"); }
  @Get("people/:id.pdf") async person(@Param("id") id: string, @Res() r: Response) { send(r, await this.reports.person(id), "application/pdf", "einweisungsuebersicht.pdf"); }
}
function send(response: Response, body: Buffer, type: string, filename: string) { response.setHeader("Content-Type", type); response.setHeader("Cache-Control", "private, no-store"); response.setHeader("Content-Disposition", `attachment; filename="${filename}"`); response.send(body); }
