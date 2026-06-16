import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { randomBytes } from "node:crypto";
import { AuditService } from "../services/audit.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import { mapKit, mapTemplate } from "../persistence/mappers.js";
import { Roles } from "../auth/auth.decorators.js";

@ApiTags("Stammdaten")
@Roles("ADMIN")
@Controller("catalog")
export class CatalogController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  @Roles("ADMIN", "WAREHOUSE")
  @Get("articles")
  articles() {
    return this.prisma.article.findMany({ orderBy: { name: "asc" } });
  }

  @Post("articles")
  async createArticle(@Body() body: ArticleWriteBody) {
    if (!body.name?.trim() || !body.unit?.trim()) {
      throw new BadRequestException("Artikelname und Einheit sind erforderlich.");
    }
    const article = await this.prisma.article.create({
      data: toArticleWriteData(body)
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "ARTICLE_CREATED",
      entityType: "Article",
      entityId: article.id,
      payload: article
    });
    return article;
  }

  @Patch("articles/:id")
  async updateArticle(@Param("id") id: string, @Body() body: ArticleWriteBody) {
    if (!body.name?.trim() || !body.unit?.trim()) {
      throw new BadRequestException("Artikelname und Einheit sind erforderlich.");
    }
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Artikel nicht gefunden.");
    }
    const article = await this.prisma.article.update({
      where: { id },
      data: toArticleWriteData(body)
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "ARTICLE_UPDATED",
      entityType: "Article",
      entityId: article.id,
      payload: { previous: existing, next: article }
    });
    return article;
  }

  @Roles("ADMIN", "WAREHOUSE")
  @Get("locations")
  locations() {
    return this.prisma.location.findMany({ orderBy: { name: "asc" } });
  }

  @Post("locations")
  async createLocation(@Body() body: { name: string; kind: string }) {
    if (!body.name?.trim() || !body.kind?.trim()) {
      throw new BadRequestException("Name und Typ des Lagerorts sind erforderlich.");
    }
    const location = await this.prisma.location.create({
      data: {
        name: body.name.trim(),
        kind: body.kind.trim()
      }
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "LOCATION_CREATED",
      entityType: "Location",
      entityId: location.id,
      payload: location
    });
    return location;
  }

  @Patch("locations/:id")
  async updateLocation(@Param("id") id: string, @Body() body: { name: string; kind: string }) {
    if (!body.name?.trim() || !body.kind?.trim()) {
      throw new BadRequestException("Name und Typ des Lagerorts sind erforderlich.");
    }
    const existing = await this.prisma.location.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Lagerort nicht gefunden.");
    }
    const location = await this.prisma.location.update({
      where: { id },
      data: {
        name: body.name.trim(),
        kind: body.kind.trim()
      }
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "LOCATION_UPDATED",
      entityType: "Location",
      entityId: location.id,
      payload: { previous: existing, next: location }
    });
    return location;
  }

  @Roles("ADMIN", "WAREHOUSE")
  @Get("templates")
  async templates() {
    const templates = await this.prisma.kitTemplate.findMany({
      include: { positions: { include: { article: true } } },
      orderBy: [{ name: "asc" }, { version: "desc" }]
    });
    return templates.map(mapTemplate);
  }

  @Post("templates")
  async createTemplate(@Body() body: {
    name: string;
    version?: number;
    positions: Array<{ articleId: string; moduleName?: string; requiredQuantity: number; critical?: boolean }>;
  }) {
    if (!body.name?.trim()) {
      throw new BadRequestException("Vorlagenname ist erforderlich.");
    }
    if (!Array.isArray(body.positions) || body.positions.length === 0) {
      throw new BadRequestException("Eine Vorlage benötigt mindestens eine Position.");
    }

    const positionPayload = await this.validateTemplatePositions(body.positions);

    const name = body.name.trim();
    const version = body.version && Number.isFinite(body.version)
      ? Math.trunc(body.version)
      : await this.nextTemplateVersion(name);
    if (version <= 0) {
      throw new BadRequestException("Vorlagenversion muss größer als 0 sein.");
    }

    const template = await this.prisma.kitTemplate.create({
      data: {
        name,
        version,
        positions: { create: positionPayload }
      },
      include: { positions: { include: { article: true } } }
    }).catch((error: unknown) => {
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException("Diese Vorlagenversion existiert bereits.");
      }
      throw error;
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "TEMPLATE_CREATED",
      entityType: "KitTemplate",
      entityId: template.id,
      payload: { name: template.name, version: template.version, positions: template.positions.length }
    });
    return mapTemplate(template);
  }

  @Post("templates/:id/revise")
  async reviseTemplate(
    @Param("id") id: string,
    @Body() body: { positions: Array<{ articleId: string; moduleName?: string; requiredQuantity: number; critical?: boolean }> }
  ) {
    const existing = await this.prisma.kitTemplate.findUnique({
      where: { id },
      include: { positions: { include: { article: true } } }
    });
    if (!existing) {
      throw new NotFoundException("Rucksackvorlage nicht gefunden.");
    }
    if (!Array.isArray(body.positions) || body.positions.length === 0) {
      throw new BadRequestException("Eine Vorlage benötigt mindestens eine Position.");
    }

    const template = await this.prisma.kitTemplate.create({
      data: {
        name: existing.name,
        version: await this.nextTemplateVersion(existing.name),
        positions: { create: await this.validateTemplatePositions(body.positions) }
      },
      include: { positions: { include: { article: true } } }
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "TEMPLATE_REVISED",
      entityType: "KitTemplate",
      entityId: template.id,
      payload: {
        previousTemplateId: existing.id,
        previousVersion: existing.version,
        nextVersion: template.version
      }
    });
    return mapTemplate(template);
  }

  @Roles("ADMIN", "WAREHOUSE")
  @Get("kits")
  async kits() {
    const kits = await this.prisma.kit.findMany({
      include: {
        location: true,
        template: { include: { positions: { include: { article: true } } } }
      },
      orderBy: { code: "asc" }
    });
    return kits.map(mapKit);
  }

  @Post("kits")
  async createKit(@Body() body: { name: string; code: string; locationId: string; templateId: string }) {
    if (!body.name?.trim() || !body.code?.trim() || !body.locationId || !body.templateId) {
      throw new BadRequestException("Name, Code, Lagerort und Vorlage sind erforderlich.");
    }
    const kit = await this.prisma.kit.create({
      data: {
        name: body.name.trim(),
        code: body.code.trim(),
        locationId: body.locationId,
        templateId: body.templateId,
        status: "READY",
        publicToken: randomBytes(24).toString("base64url"),
        tokenRotatedAt: new Date()
      },
      include: {
        location: true,
        template: { include: { positions: { include: { article: true } } } }
      }
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "KIT_CREATED",
      entityType: "Kit",
      entityId: kit.id
    });
    return mapKit(kit);
  }

  @Patch("kits/:id")
  async updateKit(@Param("id") id: string, @Body() body: { name: string; code: string; locationId: string; templateId: string }) {
    if (!body.name?.trim() || !body.code?.trim() || !body.locationId || !body.templateId) {
      throw new BadRequestException("Name, Code, Lagerort und Vorlage sind erforderlich.");
    }
    const existing = await this.prisma.kit.findUnique({
      where: { id },
      include: {
        location: true,
        template: { include: { positions: { include: { article: true } } } }
      }
    });
    if (!existing) {
      throw new NotFoundException("Rucksack nicht gefunden.");
    }
    const kit = await this.prisma.kit.update({
      where: { id },
      data: {
        name: body.name.trim(),
        code: body.code.trim(),
        locationId: body.locationId,
        templateId: body.templateId
      },
      include: {
        location: true,
        template: { include: { positions: { include: { article: true } } } }
      }
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "KIT_UPDATED",
      entityType: "Kit",
      entityId: kit.id,
      payload: {
        previous: {
          name: existing.name,
          code: existing.code,
          locationId: existing.locationId,
          templateId: existing.templateId
        },
        next: {
          name: kit.name,
          code: kit.code,
          locationId: kit.locationId,
          templateId: kit.templateId
        }
      }
    });
    return mapKit(kit);
  }

  @Post("kits/:id/rotate-token")
  async rotateToken(@Param("id") id: string) {
    const existing = await this.prisma.kit.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Rucksack nicht gefunden.");
    }
    const kit = await this.prisma.kit.update({
      where: { id },
      data: {
        publicToken: randomBytes(24).toString("base64url"),
        tokenRotatedAt: new Date()
      },
      include: {
        location: true,
        template: { include: { positions: { include: { article: true } } } }
      }
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "KIT_TOKEN_ROTATED",
      entityType: "Kit",
      entityId: kit.id
    });
    return mapKit(kit);
  }

  private async nextTemplateVersion(name: string): Promise<number> {
    const latest = await this.prisma.kitTemplate.findFirst({
      where: { name },
      orderBy: { version: "desc" },
      select: { version: true }
    });
    return (latest?.version ?? 0) + 1;
  }

  private async validateTemplatePositions(positions: Array<{ articleId: string; moduleName?: string; requiredQuantity: number; critical?: boolean }>) {
    const positionPayload = positions.map((position) => {
      const requiredQuantity = Math.trunc(position.requiredQuantity);
      if (!position.articleId?.trim() || !Number.isFinite(requiredQuantity) || requiredQuantity <= 0) {
        throw new BadRequestException("Jede Vorlagenposition benötigt Artikel und Sollmenge.");
      }
      return {
        articleId: position.articleId,
        moduleName: position.moduleName?.trim() || undefined,
        requiredQuantity,
        critical: Boolean(position.critical)
      };
    });

    const articleIds = [...new Set(positionPayload.map((position) => position.articleId))];
    const knownArticleCount = await this.prisma.article.count({
      where: { id: { in: articleIds } }
    });
    if (knownArticleCount !== articleIds.length) {
      throw new BadRequestException("Mindestens eine Vorlagenposition verweist auf einen unbekannten Artikel.");
    }

    return positionPayload;
  }
}

type ArticleWriteBody = {
  name: string;
  unit: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  category?: string;
  barcode?: string;
  sterile?: boolean;
  storageNotes?: string;
  notes?: string;
  criticalDefault?: boolean;
};

function toArticleWriteData(body: ArticleWriteBody) {
  return {
    name: body.name.trim(),
    unit: body.unit.trim(),
    manufacturer: optionalText(body.manufacturer),
    manufacturerPartNumber: optionalText(body.manufacturerPartNumber),
    category: optionalText(body.category),
    barcode: optionalText(body.barcode),
    sterile: Boolean(body.sterile),
    storageNotes: optionalText(body.storageNotes),
    notes: optionalText(body.notes),
    criticalDefault: Boolean(body.criticalDefault)
  };
}

function optionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isPrismaUniqueError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
