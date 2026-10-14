import {
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles, RateLimit } from "../../auth/auth.decorators.js";
import { PrismaService } from "../../persistence/prisma.service.js";
import { AuditService } from "../../services/audit.service.js";
import { fetchMeierProduct, validateMeierUrl } from "./article-import/fetch.js";
import { parseMeierProduct } from "./article-import/parser.js";
import {
  reconciliationFields,
  validateReconciliationChanges,
  validateVersion,
} from "./article-reconciliation/changes.js";

@ApiTags("Stammdaten")
@Roles("ADMIN")
@Controller("catalog/articles")
export class CatalogArticleReconciliationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post(":id/meier-preview")
  @RateLimit({ limit: 60, windowMs: 60_000 })
  async preview(@Param("id") id: string) {
    const article = await this.prisma.article.findFirst({
      where: { id, deletedAt: null },
    });
    if (!article) throw new NotFoundException("Artikel nicht gefunden.");
    const current = Object.fromEntries(
      reconciliationFields.map((field) => [field, article[field] ?? null]),
    );
    const expectedUpdatedAt = article.updatedAt.toISOString();
    const product = await fetchMeierProduct(article.articleUrl);
    return {
      articleId: id,
      expectedUpdatedAt,
      current,
      preview: parseMeierProduct(product.body, product.url),
    };
  }

  @Post(":id/meier-apply")
  @RateLimit({ limit: 120, windowMs: 60_000 })
  async apply(
    @Param("id") id: string,
    @Body() body: { expectedUpdatedAt?: unknown; changes?: unknown },
  ) {
    const updatedAt = validateVersion(body?.expectedUpdatedAt);
    const changes = validateReconciliationChanges(body?.changes);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.article.findFirst({
        where: { id, deletedAt: null },
      });
      if (!existing) throw new NotFoundException("Artikel nicht gefunden.");
      validateMeierUrl(existing.articleUrl);
      const result = await tx.article.updateMany({
        where: { id, deletedAt: null, updatedAt },
        data: changes,
      });
      if (result.count !== 1)
        throw new ConflictException(
          "Der Artikel wurde zwischenzeitlich geändert. Bitte erneut abgleichen.",
        );
      await this.audit.recordInTransaction(tx, {
        actorType: "USER",
        actorLabel: "Admin",
        action: "ARTICLE_MEIER_RECONCILED",
        entityType: "Article",
        entityId: id,
        payload: {
          previous: Object.fromEntries(
            Object.keys(changes).map((key) => [
              key,
              existing[key as keyof typeof existing] ?? null,
            ]),
          ),
          changes,
        },
      });
      return { ok: true as const };
    });
  }
}
