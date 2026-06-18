import { Injectable, NotFoundException } from "@nestjs/common";
import type { KitOperationalStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../persistence/prisma.service.js";

const listInclude = {
  kit: { select: { id: true, name: true, code: true } },
  order: { select: { id: true, status: true } },
  positions: { select: { missingQuantity: true, surplusQuantity: true, discardedExpiredQuantity: true } }
} satisfies Prisma.CheckInclude;

const detailInclude = {
  kit: { select: { id: true, name: true, code: true } },
  order: { select: { id: true, status: true } },
  positions: {
    orderBy: [{ moduleName: "asc" }, { articleName: "asc" }],
    select: {
      id: true, articleId: true, articleName: true, moduleName: true, unit: true,
      requiredQuantity: true, countedQuantity: true, discardedExpiredQuantity: true,
      missingQuantity: true, surplusQuantity: true, critical: true, note: true
    }
  }
} satisfies Prisma.CheckInclude;

type CheckListRecord = Prisma.CheckGetPayload<{ include: typeof listInclude }>;
type CheckDetailRecord = Prisma.CheckGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class CheckRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: { q?: string; kitId?: string; status?: string; page?: string }) {
    const q = filters.q?.trim();
    const page = toPage(filters.page);
    const pageSize = 25;
    const where: Prisma.CheckWhereInput = {
      kitId: filters.kitId || undefined,
      effectiveStatus: toStatus(filters.status),
      OR: q ? [
        { checkerName: { contains: q } },
        { kit: { name: { contains: q } } },
        { kit: { code: { contains: q } } }
      ] : undefined
    };
    const [records, total] = await Promise.all([
      this.prisma.check.findMany({ where, include: listInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.check.count({ where })
    ]);
    return { items: records.map(mapSummary), page, pageSize, total };
  }

  async detail(id: string) {
    const record = await this.prisma.check.findUnique({ where: { id }, include: detailInclude });
    if (!record) throw new NotFoundException("Check-Protokoll nicht gefunden.");
    return {
      ...mapSummary(record),
      signaturePngDataUrl: record.signaturePngDataUrl,
      positions: record.positions.map((position) => ({
        ...position,
        moduleName: position.moduleName ?? undefined,
        note: position.note ?? undefined
      }))
    };
  }
}

function mapSummary(record: CheckListRecord | CheckDetailRecord) {
  return {
    id: record.id,
    checkerName: record.checkerName,
    selectedStatus: record.selectedStatus,
    effectiveStatus: record.effectiveStatus,
    statusReason: record.statusReason ?? undefined,
    warnings: toStringArray(record.warningsJson),
    signatureHash: record.signatureHash,
    positionCount: record.positions.length,
    deviationCount: record.positions.filter(hasDeviation).length,
    kit: record.kit,
    replenishmentOrder: record.order ?? undefined,
    createdAt: record.createdAt.toISOString()
  };
}

function hasDeviation(position: { missingQuantity: number; surplusQuantity: number; discardedExpiredQuantity: number }) {
  return position.missingQuantity > 0 || position.surplusQuantity > 0 || position.discardedExpiredQuantity > 0;
}

function toStringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function toStatus(value?: string): KitOperationalStatus | undefined {
  return value === "READY" || value === "CONDITIONAL" || value === "NOT_READY" ? value : undefined;
}

function toPage(value?: string) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}
