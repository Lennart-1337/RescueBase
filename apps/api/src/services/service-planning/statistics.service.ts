import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service.js";
import { serviceInclude } from "./record.js";
import { serviceFilter } from "./query.js";
import { serviceStatistics, statisticsCsv } from "./statistics.js";
import type { Input } from "./input.js";
@Injectable()
export class ServiceStatisticsService {
  constructor(private readonly db: PrismaService) {}
  async statistics(query: Input) {
    const records = await this.db.serviceEvent.findMany({
      where: {
        AND: [
          serviceFilter(query),
          { status: { notIn: ["INQUIRY", "CANCELLED"] } },
        ],
      },
      include: serviceInclude,
      orderBy: { startsAt: "asc" },
    });
    return serviceStatistics(records);
  }
  async csv(query: Input) {
    return statisticsCsv(await this.statistics(query));
  }
}
