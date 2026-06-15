import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createHash } from "node:crypto";
import {
  createSignatureHashPayload,
  evaluateCheck,
  type CheckCompletionInput
} from "@rescuebase/domain";
import { AuditService } from "../services/audit.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import { mapOrder, mapTemplate, toIsoDateTime, type KitRecord } from "../persistence/mappers.js";
import { PublicRoute } from "../auth/auth.decorators.js";

type PublicCheckTransaction = Pick<PrismaService, "check" | "kit" | "replenishmentOrder" | "auditEvent">;
type PublicKitRecord = Omit<KitRecord, "location">;

@ApiTags("Öffentliche Checks")
@PublicRoute()
@Controller("public/kits")
export class PublicChecksController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  @Get(":token")
  async getPublicKit(@Param("token") token: string) {
    const kit = await this.findKitByToken(token);
    const template = mapTemplate(kit.template);
    return {
      kit: {
        id: kit.id,
        name: kit.name,
        code: kit.code,
        status: kit.status
      },
      template
    };
  }

  @Post(":token/checks")
  async completeCheck(@Param("token") token: string, @Body() body: Omit<CheckCompletionInput, "kitId">) {
    const kit = await this.findKitByToken(token);
    const template = mapTemplate(kit.template);
    const completedAt = new Date();
    const completedAtIso = completedAt.toISOString();
    const input: CheckCompletionInput = { ...body, kitId: kit.id };
    const evaluation = evaluateCheck(template.positions, input);
    const effectiveStatus = evaluation.effectiveStatus;
    const signatureHash = createHash("sha256")
      .update(createSignatureHashPayload(input, completedAtIso))
      .update(body.signaturePngDataUrl)
      .digest("hex");

    const result = await this.prisma.$transaction(async (tx: PublicCheckTransaction) => {
      const check = await tx.check.create({
        data: {
          kitId: kit.id,
          checkerName: body.checkerName,
          selectedStatus: effectiveStatus,
          effectiveStatus,
          warningsJson: evaluation.warnings,
          signaturePngDataUrl: body.signaturePngDataUrl,
          signatureHash,
          createdAt: completedAt,
          positions: {
            create: evaluation.positions.map((position) => ({
              templatePositionId: position.templatePositionId,
              articleId: position.articleId,
              articleName: position.articleName,
              moduleName: position.moduleName,
              unit: position.unit,
              requiredQuantity: position.requiredQuantity,
              countedQuantity: position.countedQuantity,
              discardedExpiredQuantity: position.discardedExpiredQuantity,
              missingQuantity: position.missingQuantity,
              surplusQuantity: position.surplusQuantity,
              critical: position.critical,
              note: position.note
            }))
          }
        }
      });

      await tx.kit.update({
        where: { id: kit.id },
        data: { status: effectiveStatus }
      });

      const replenishmentOrder = evaluation.replenishmentItems.length > 0
        ? await tx.replenishmentOrder.create({
          data: {
            kitId: kit.id,
            checkId: check.id,
            status: "OPEN",
            createdAt: completedAt,
            updatedAt: completedAt,
            items: {
              create: evaluation.replenishmentItems.map((item) => ({
                articleId: item.articleId,
                articleName: item.articleName,
                templatePositionId: item.templatePositionId,
                requestedQuantity: item.neededQuantity,
                fulfilledQuantity: 0,
                reason: item.reason,
                unit: item.unit,
                critical: item.critical
              }))
            }
          },
          include: { items: true, kit: true }
        })
        : undefined;

      await this.audit.recordInTransaction(tx, {
        actorType: "PUBLIC_CHECKER",
        actorLabel: body.checkerName,
        action: "CHECK_COMPLETED",
        entityType: "Kit",
        entityId: kit.id,
        payload: {
          checkId: check.id,
          effectiveStatus,
          replenishmentOrderId: replenishmentOrder?.id
        }
      });

      return { check, replenishmentOrder };
    });

    return {
      check: {
        id: result.check.id,
        kitId: result.check.kitId,
        checkerName: result.check.checkerName,
        effectiveStatus: result.check.effectiveStatus,
        warnings: evaluation.warnings,
        signaturePngDataUrl: result.check.signaturePngDataUrl,
        signatureHash: result.check.signatureHash,
        createdAt: toIsoDateTime(result.check.createdAt)
      }
      ,
      evaluation,
      replenishmentOrder: result.replenishmentOrder ? mapOrder(result.replenishmentOrder) : undefined
    };
  }

  private async findKitByToken(token: string): Promise<PublicKitRecord> {
    const kit: PublicKitRecord | null = await this.prisma.kit.findUnique({
      where: { publicToken: token },
      include: {
        template: { include: { positions: { include: { article: true } } } }
      }
    });
    if (!kit) {
      throw new NotFoundException("Rucksack-Link ist ungültig oder wurde rotiert.");
    }
    return kit;
  }
}
