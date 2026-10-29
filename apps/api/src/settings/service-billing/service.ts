import { ConflictException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../persistence/prisma.service.js";
import { audit, integer } from "../../services/mpg-validation.js";
import { json } from "../../services/service-planning/catalog.service.js";
import { object } from "../../services/service-planning/input.js";
import { rethrowConflict } from "../../services/service-planning/persistence.js";
import { defaultBillingSettings } from "./defaults.js";
import { readBillingSettings } from "./read.js";
import { normalizeBillingSettings } from "./validation.js";
@Injectable()
export class ServiceBillingSettingsService {
  constructor(private readonly db: PrismaService) {}
  get(tx?: Prisma.TransactionClient) {
    return readBillingSettings(tx ?? this.db);
  }
  async update(value: unknown, actor: string) {
    const { version, ...input } = object(value),
      expectedVersion = integer(version);
    const data = normalizeBillingSettings(input);
    try {
      return await this.db.$transaction(async (tx) => {
        const previous = await tx.serviceBillingSettings.upsert({
          where: { id: "singleton" },
          update: {},
          create: { id: "singleton", data: json(defaultBillingSettings) },
        });
        if (previous.version !== expectedVersion)
          throw new ConflictException(
            "Die Dokumenteinstellungen wurden zwischenzeitlich geändert. Bitte neu laden.",
          );
        const result = await tx.serviceBillingSettings.updateMany({
          where: { id: "singleton", version: expectedVersion },
          data: { data: json(data), version: { increment: 1 } },
        });
        if (result.count !== 1)
          throw new ConflictException(
            "Die Dokumenteinstellungen wurden zwischenzeitlich geändert. Bitte neu laden.",
          );
        await audit(
          tx,
          actor,
          "ServiceBillingSettings",
          "singleton",
          "SERVICE_BILLING_SETTINGS_UPDATED",
          {
            previousVersion: expectedVersion,
            version: expectedVersion + 1,
            before: previous.data,
            after: data,
          },
        );
        return { ...data, version: expectedVersion + 1 };
      });
    } catch (error) {
      rethrowConflict(error);
    }
  }
}
