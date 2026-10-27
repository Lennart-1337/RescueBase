import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  calculateMaurer,
  calculateCologne,
  type MaurerInput,
  type CologneInput,
} from "@rescuebase/domain";
import { PrismaService } from "../../persistence/prisma.service.js";
import { audit, revision } from "../mpg-validation.js";
import { choice, object, string, type Input } from "./input.js";
import { json } from "./catalog.service.js";
import { rethrowConflict } from "./persistence.js";
import { ServiceEventsService } from "./events.service.js";
@Injectable()
export class ServiceCalculationsService {
  constructor(
    private readonly db: PrismaService,
    private readonly events: ServiceEventsService,
  ) {}
  async create(id: string, body: Input, actor: string) {
    body = object(body);
    const method = choice(body.method, ["MAURER", "COLOGNE"] as const),
      input = object(body.input),
      reason = string(body.reason, "Anpassungsbegründung", false, 20000);
    let result;
    try {
      result =
        method === "MAURER"
          ? calculateMaurer(input as MaurerInput)
          : calculateCologne(input as CologneInput);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Ungültige Berechnungseingaben.",
      );
    }
    try {
      await this.db.$transaction(async (tx) => {
        const old = await tx.serviceEvent.findUnique({ where: { id } });
        if (!old) throw new NotFoundException("Dienst nicht gefunden.");
        revision(old.version, body.version);
        if (["COMPLETED", "CANCELLED"].includes(old.status))
          throw new BadRequestException(
            "Dienst muss zuerst wieder geöffnet werden.",
          );
        const previous = await tx.serviceCalculation.count({
          where: { serviceId: id },
        });
        if (previous && !reason)
          throw new BadRequestException(
            "Neue Berechnungsstände benötigen eine Änderungsbegründung.",
          );
        await tx.serviceCalculation.create({
          data: {
            serviceId: id,
            method,
            methodVersion: result.methodVersion,
            sourceUrl: result.sourceUrls[0] ?? "",
            input: json(input),
            result: json(result),
            reason,
            createdBy: actor,
          },
        });
        await tx.serviceEvent.update({
          where: { id, version: old.version },
          data: {
            version: { increment: 1 },
            ...(["RELEASED", "ACTIVE", "REVIEW"].includes(old.status)
              ? { status: "PLANNING" }
              : {}),
          },
        });
        await audit(
          tx,
          actor,
          "ServiceEvent",
          id,
          "SERVICE_CALCULATION_ADDED",
          { method, methodVersion: result.methodVersion, reason },
        );
      });
      return this.events.detail(id);
    } catch (error) {
      rethrowConflict(error);
    }
  }
}
