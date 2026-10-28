import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service.js";
import { audit, revision } from "../mpg-validation.js";
import { json, wire } from "./catalog.service.js";
import {
  serviceInclude,
  planningSnapshot,
  type ServiceRecord,
} from "./record.js";
import { normalizeService } from "./validation.js";
import {
  scalarData,
  validateReferences,
  replaceChildren,
  rethrowConflict,
} from "./persistence.js";
import { serviceWarnings, serviceWarningsBatch } from "./warnings.js";
import { serviceCosts } from "./costs.js";
import { withPositionQualifications } from "./qualification.js";
import { object, choice, string, type Input } from "./input.js";
import { serviceStatuses, type ServiceStatus } from "./types.js";
import { serviceFilter } from "./query.js";
import { removeService } from "./soft-delete.js";
import { validateTransition } from "./lifecycle.js";
@Injectable()
export class ServiceEventsService {
  constructor(private readonly db: PrismaService) {}
  remove(id: string, body: Input, actor: string) {
    return removeService(this.db, id, body, actor);
  }
  async list(query: Input = {}) {
    const rows = await this.db.serviceEvent.findMany({
      where: serviceFilter(query),
      include: serviceInclude,
      orderBy: { startsAt: "desc" },
    });
    const warnings = await serviceWarningsBatch(this.db, rows);
    return Promise.all(
      rows.map((row) => this.present(row, warnings.get(row.id))),
    );
  }
  async detail(id: string) {
    return this.present(await this.find(id));
  }
  private async find(id: string) {
    const row = await this.db.serviceEvent.findUnique({
      where: { id, deletedAt: null },
      include: serviceInclude,
    });
    if (!row) throw new NotFoundException("Dienst nicht gefunden.");
    return row;
  }
  private async present(
    row: ServiceRecord,
    warnings?: Awaited<ReturnType<typeof serviceWarnings>>,
  ) {
    const { deletedAt: _deletedAt, ...record } = withPositionQualifications(row);
    return {
      ...record,
      warnings: warnings ?? (await serviceWarnings(this.db, row)),
      costs: serviceCosts(row),
    };
  }
  async save(id: string | null, body: Input, actor: string) {
    body = object(body);
    try {
      await this.db.$transaction(async (tx) => {
        const old = id
          ? await tx.serviceEvent.findUnique({
              where: { id, deletedAt: null },
              include: serviceInclude,
            })
          : null;
        if (id && !old) throw new NotFoundException("Dienst nicht gefunden.");
        if (old) {
          revision(old.version, body.version);
          if (["COMPLETED", "CANCELLED"].includes(old.status))
            throw new BadRequestException(
              "Dienst muss zunächst mit Begründung wieder geöffnet werden.",
            );
        }
        const data = normalizeService({ ...(old ? wire(old) : {}), ...body });
        await validateReferences(tx, data);
        // A tariff is copied when first selected. Existing line snapshots never follow tariff changes.
        for (const line of data.lines)
          if (
            line.tariffId &&
            !old?.lines.some(
              (previous) =>
                previous.id === line.id && previous.tariffId === line.tariffId,
            )
          ) {
            const tariff = await tx.serviceTariff.findFirst({
              where: { id: line.tariffId, active: true },
            });
            if (!tariff)
              throw new BadRequestException("Tarif ist nicht verfügbar.");
            line.costRate = tariff.costRate.toString();
            line.saleRate = tariff.saleRate.toString();
          }
        const row = old
          ? await tx.serviceEvent.update({
              where: { id: old.id, version: old.version, deletedAt: null },
              data: { ...scalarData(data), version: { increment: 1 } },
            })
          : await tx.serviceEvent.create({ data: scalarData(data) });
        await replaceChildren(tx, row.id, data);
        const next = await tx.serviceEvent.findUniqueOrThrow({
          where: { id: row.id },
          include: serviceInclude,
        });
        if (
          old &&
          JSON.stringify(json(planningSnapshot(old))) !==
            JSON.stringify(json(planningSnapshot(next))) &&
          ["RELEASED", "ACTIVE", "REVIEW"].includes(old.status)
        )
          await tx.serviceEvent.update({
            where: { id: row.id },
            data: { status: "PLANNING" },
          });
        await audit(
          tx,
          actor,
          "ServiceEvent",
          row.id,
          old ? "SERVICE_UPDATED" : "SERVICE_CREATED",
          {
            previousVersion: old?.version,
            version: row.version,
            before: old
              ? normalizeService(wire(old) as unknown as Input)
              : null,
            after: data,
          },
        );
        id = row.id;
      });
      return this.detail(id!);
    } catch (error) {
      rethrowConflict(error);
    }
  }
  async transition(id: string, body: Input, actor: string) {
    body = object(body);
    try {
      await this.db.$transaction(async (tx) => {
        const old = await tx.serviceEvent.findUnique({
          where: { id, deletedAt: null },
          include: serviceInclude,
        });
        if (!old) throw new NotFoundException("Dienst nicht gefunden.");
        revision(old.version, body.version);
        const status = choice(body.status, serviceStatuses),
          reason = string(body.reason, "Begründung", false, 20000),
          warnings = await serviceWarnings(tx, old);
        validateTransition(
          old.status as ServiceStatus,
          status,
          reason,
          warnings.length,
        );
        if (status === "RELEASED")
          await tx.serviceRelease.create({
            data: {
              serviceId: id,
              serviceVersion: old.version,
              snapshot: json({ ...old, releases: undefined }),
              warnings: json(warnings),
              reason,
              createdBy: actor,
            },
          });
        await tx.serviceEvent.update({
          where: { id, version: old.version, deletedAt: null },
          data: { status, version: { increment: 1 } },
        });
        await audit(tx, actor, "ServiceEvent", id, "SERVICE_STATUS_CHANGED", {
          from: old.status,
          to: status,
          reason,
          warnings,
        });
      });
      return this.detail(id);
    } catch (error) {
      rethrowConflict(error);
    }
  }
}
