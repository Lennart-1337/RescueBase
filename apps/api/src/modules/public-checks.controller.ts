import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createHash } from "node:crypto";
import {
  createSignatureHashPayload,
  deriveKitStatusFromEvaluation,
  evaluateCheck,
  type CheckCompletionInput
} from "@rescuebase/domain";
import { AuditService } from "../services/audit.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import { mapOrder, mapTemplate, toIsoDateTime } from "../persistence/mappers.js";
import { PublicRoute } from "../auth/auth.decorators.js";

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
    const effectiveStatus = deriveKitStatusFromEvaluation(evaluation);
    const signatureHash = createHash("sha256")
      .update(createSignatureHashPayload(input, completedAtIso))
      .update(body.signaturePngDataUrl)
      .digest("hex");

    const result = await this.prisma.$transaction(async (tx) => {
      const check = await tx.check.create({
        data: {
          kitId: kit.id,
          checkerName: body.checkerName,
          selectedStatus: body.selectedStatus,
          effectiveStatus,
          statusReason: body.statusReason,
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
          selectedStatus: body.selectedStatus,
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
        selectedStatus: result.check.selectedStatus,
        effectiveStatus: result.check.effectiveStatus,
        statusReason: result.check.statusReason ?? undefined,
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

  private async findKitByToken(token: string) {
    const kit = await this.prisma.kit.findUnique({
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
