import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { randomBytes } from "node:crypto";
import { AuditService } from "../services/audit.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import { mapKit, mapTemplate } from "../persistence/mappers.js";
import { Roles } from "../auth/auth.decorators.js";

const templatePositionsInclude = {
  include: { article: true },
  orderBy: { sortOrder: "asc" as const },
};

const articleInclude = {
  defaultSupplier: { select: { id: true, name: true } },
};

@ApiTags("Stammdaten")
@Roles("ADMIN")
@Controller("catalog")
export class CatalogController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Roles("ADMIN", "WAREHOUSE")
  @Get("articles")
  async articles() {
    const articles = await this.prisma.article.findMany({
      where: { deletedAt: null },
      include: articleInclude,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return articles.map(mapArticle);
  }

  @Post("articles")
  async createArticle(@Body() body: ArticleWriteBody) {
    if (!body.name?.trim() || !body.unit?.trim()) {
      throw new BadRequestException(
        "Artikelname und Einheit sind erforderlich.",
      );
    }
    const article = await this.prisma.article.create({
      data: {
        ...toArticleWriteData(
          body,
          await this.normalizeOptionalSupplierId(body.defaultSupplierId),
        ),
        sortOrder: await this.nextArticleSortOrder(),
      },
      include: articleInclude,
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "ARTICLE_CREATED",
      entityType: "Article",
      entityId: article.id,
      payload: mapArticle(article),
    });
    return mapArticle(article);
  }

  @Post("articles/reorder")
  async reorderArticles(@Body() body: { articleIds: string[] }) {
    if (!Array.isArray(body.articleIds) || body.articleIds.length === 0) {
      throw new BadRequestException(
        "Für die Sortierung werden Artikel-IDs benötigt.",
      );
    }
    const activeArticles = await this.prisma.article.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    const activeIds = activeArticles.map((article) => article.id);
    if (
      body.articleIds.length !== activeIds.length ||
      new Set(body.articleIds).size !== body.articleIds.length
    ) {
      throw new BadRequestException(
        "Die Sortierung muss jeden aktiven Artikel genau einmal enthalten.",
      );
    }
    if (body.articleIds.some((id) => !activeIds.includes(id))) {
      throw new BadRequestException(
        "Die Sortierung enthält unbekannte Artikel.",
      );
    }
    await this.prisma.$transaction(
      body.articleIds.map((id, index) =>
        this.prisma.article.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "ARTICLE_REORDERED",
      entityType: "Article",
      entityId: "catalog",
      payload: { articleIds: body.articleIds },
    });
    return { ok: true };
  }

  @Patch("articles/:id")
  async updateArticle(@Param("id") id: string, @Body() body: ArticleWriteBody) {
    if (!body.name?.trim() || !body.unit?.trim()) {
      throw new BadRequestException(
        "Artikelname und Einheit sind erforderlich.",
      );
    }
    const existing = await this.prisma.article.findFirst({
      where: { id, deletedAt: null },
      include: articleInclude,
    });
    if (!existing) {
      throw new NotFoundException("Artikel nicht gefunden.");
    }
    const article = await this.prisma.article.update({
      where: { id },
      data: toArticleWriteData(
        body,
        await this.normalizeOptionalSupplierId(body.defaultSupplierId),
      ),
      include: articleInclude,
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "ARTICLE_UPDATED",
      entityType: "Article",
      entityId: article.id,
      payload: { previous: mapArticle(existing), next: mapArticle(article) },
    });
    return mapArticle(article);
  }

  @Delete("articles/:id")
  async deleteArticle(@Param("id") id: string): Promise<{ ok: true }> {
    const article = await this.prisma.article.findFirst({
      where: { id, deletedAt: null },
    });
    if (!article) {
      throw new NotFoundException("Artikel nicht gefunden.");
    }
    const activeBatchCount = await this.prisma.batch.count({
      where: { articleId: id, deletedAt: null },
    });
    const activeTemplatePositionCount =
      await this.prisma.templatePosition.count({
        where: { articleId: id, template: { deletedAt: null } },
      });
    if (activeBatchCount > 0 || activeTemplatePositionCount > 0) {
      throw new BadRequestException(
        "Artikel kann erst gelöscht werden, wenn keine aktiven Chargen oder Vorlagenpositionen darauf verweisen.",
      );
    }
    const deletedAt = new Date();
    await this.prisma.article.update({ where: { id }, data: { deletedAt } });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "ARTICLE_DELETED",
      entityType: "Article",
      entityId: id,
      payload: { name: article.name, deletedAt: deletedAt.toISOString() },
    });
    return { ok: true };
  }

  @Roles("ADMIN", "WAREHOUSE")
  @Get("suppliers")
  suppliers() {
    return this.prisma.supplier.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  @Post("suppliers")
  async createSupplier(@Body() body: SupplierWriteBody) {
    const name = normalizeRequiredText(
      body.name,
      "Lieferantenname ist erforderlich.",
    );
    await this.assertUniqueActiveSupplierName(name);
    const archived = await this.prisma.supplier.findFirst({
      where: { name, deletedAt: { not: null } },
    });
    const supplier = archived
      ? await this.prisma.supplier.update({
          where: { id: archived.id },
          data: { ...toSupplierWriteData(body), deletedAt: null, name },
        })
      : await this.prisma.supplier.create({ data: toSupplierWriteData(body) });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: archived ? "SUPPLIER_RESTORED" : "SUPPLIER_CREATED",
      entityType: "Supplier",
      entityId: supplier.id,
      payload: supplier,
    });
    return supplier;
  }

  @Patch("suppliers/:id")
  async updateSupplier(
    @Param("id") id: string,
    @Body() body: SupplierWriteBody,
  ) {
    const existing = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException("Lieferant nicht gefunden.");
    }
    const name = normalizeRequiredText(
      body.name,
      "Lieferantenname ist erforderlich.",
    );
    if (name !== existing.name) {
      await this.assertUniqueActiveSupplierName(name, id);
    }
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: toSupplierWriteData(body),
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "SUPPLIER_UPDATED",
      entityType: "Supplier",
      entityId: supplier.id,
      payload: { previous: existing, next: supplier },
    });
    return supplier;
  }

  @Delete("suppliers/:id")
  async deleteSupplier(@Param("id") id: string): Promise<{ ok: true }> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });
    if (!supplier) {
      throw new NotFoundException("Lieferant nicht gefunden.");
    }
    const linkedArticleCount = await this.prisma.article.count({
      where: { defaultSupplierId: id, deletedAt: null },
    });
    if (linkedArticleCount > 0) {
      throw new BadRequestException(
        "Lieferant kann erst gelöscht werden, wenn kein aktiver Artikel mehr darauf verweist.",
      );
    }
    const deletedAt = new Date();
    await this.prisma.supplier.update({ where: { id }, data: { deletedAt } });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "SUPPLIER_DELETED",
      entityType: "Supplier",
      entityId: id,
      payload: { name: supplier.name, deletedAt: deletedAt.toISOString() },
    });
    return { ok: true };
  }

  @Roles("ADMIN", "WAREHOUSE")
  @Get("locations")
  locations() {
    return this.prisma.location.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  @Post("locations")
  async createLocation(@Body() body: { name: string; kind: string }) {
    if (!body.name?.trim() || !body.kind?.trim()) {
      throw new BadRequestException(
        "Name und Typ des Lagerorts sind erforderlich.",
      );
    }
    const location = await this.prisma.location.create({
      data: {
        name: body.name.trim(),
        kind: body.kind.trim(),
      },
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "LOCATION_CREATED",
      entityType: "Location",
      entityId: location.id,
      payload: location,
    });
    return location;
  }

  @Patch("locations/:id")
  async updateLocation(
    @Param("id") id: string,
    @Body() body: { name: string; kind: string },
  ) {
    if (!body.name?.trim() || !body.kind?.trim()) {
      throw new BadRequestException(
        "Name und Typ des Lagerorts sind erforderlich.",
      );
    }
    const existing = await this.prisma.location.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException("Lagerort nicht gefunden.");
    }
    const location = await this.prisma.location.update({
      where: { id },
      data: {
        name: body.name.trim(),
        kind: body.kind.trim(),
      },
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "LOCATION_UPDATED",
      entityType: "Location",
      entityId: location.id,
      payload: { previous: existing, next: location },
    });
    return location;
  }

  @Delete("locations/:id")
  async deleteLocation(@Param("id") id: string): Promise<{ ok: true }> {
    const location = await this.prisma.location.findFirst({
      where: { id, deletedAt: null },
    });
    if (!location) {
      throw new NotFoundException("Lagerort nicht gefunden.");
    }
    const activeBatchCount = await this.prisma.batch.count({
      where: { locationId: id, deletedAt: null },
    });
    const activeKitCount = await this.prisma.kit.count({
      where: { locationId: id, deletedAt: null },
    });
    const medicalDeviceCount = await this.prisma.medicalDevice.count({
      where: { locationId: id },
    });
    if (activeBatchCount > 0 || activeKitCount > 0 || medicalDeviceCount > 0) {
      throw new BadRequestException(
        "Lagerort kann erst gelöscht werden, wenn keine aktiven Chargen, Rucksäcke oder Geräte darauf verweisen.",
      );
    }
    const deletedAt = new Date();
    await this.prisma.location.update({ where: { id }, data: { deletedAt } });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "LOCATION_DELETED",
      entityType: "Location",
      entityId: id,
      payload: { name: location.name, deletedAt: deletedAt.toISOString() },
    });
    return { ok: true };
  }

  @Roles("ADMIN", "WAREHOUSE")
  @Get("templates")
  async templates() {
    const templates = await this.prisma.kitTemplate.findMany({
      where: { deletedAt: null },
      include: { positions: templatePositionsInclude },
      orderBy: [{ name: "asc" }, { version: "desc" }],
    });
    return templates.map(mapTemplate);
  }

  @Post("templates")
  async createTemplate(
    @Body()
    body: {
      name: string;
      version?: number;
      positions: Array<{
        articleId: string;
        moduleName?: string;
        requiredQuantity: number;
        critical?: boolean;
      }>;
    },
  ) {
    if (!body.name?.trim()) {
      throw new BadRequestException("Vorlagenname ist erforderlich.");
    }
    if (!Array.isArray(body.positions) || body.positions.length === 0) {
      throw new BadRequestException(
        "Eine Vorlage benötigt mindestens eine Position.",
      );
    }

    const positionPayload = await this.validateTemplatePositions(
      body.positions,
    );

    const name = body.name.trim();
    const version =
      body.version && Number.isFinite(body.version)
        ? Math.trunc(body.version)
        : await this.nextTemplateVersion(name);
    if (version <= 0) {
      throw new BadRequestException("Vorlagenversion muss größer als 0 sein.");
    }

    const template = await this.prisma.kitTemplate
      .create({
        data: {
          name,
          version,
          positions: { create: positionPayload },
        },
        include: { positions: templatePositionsInclude },
      })
      .catch((error: unknown) => {
        if (isPrismaUniqueError(error)) {
          throw new BadRequestException(
            "Diese Vorlagenversion existiert bereits.",
          );
        }
        throw error;
      });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "TEMPLATE_CREATED",
      entityType: "KitTemplate",
      entityId: template.id,
      payload: {
        name: template.name,
        version: template.version,
        positions: template.positions.length,
      },
    });
    return mapTemplate(template);
  }

  @Post("templates/:id/revise")
  async reviseTemplate(
    @Param("id") id: string,
    @Body()
    body: {
      positions: Array<{
        articleId: string;
        moduleName?: string;
        requiredQuantity: number;
        critical?: boolean;
      }>;
    },
  ) {
    const existing = await this.prisma.kitTemplate.findFirst({
      where: { id, deletedAt: null },
      include: { positions: templatePositionsInclude },
    });
    if (!existing) {
      throw new NotFoundException("Rucksackvorlage nicht gefunden.");
    }
    if (!Array.isArray(body.positions) || body.positions.length === 0) {
      throw new BadRequestException(
        "Eine Vorlage benötigt mindestens eine Position.",
      );
    }

    const template = await this.prisma.kitTemplate.create({
      data: {
        name: existing.name,
        version: await this.nextTemplateVersion(existing.name),
        positions: {
          create: await this.validateTemplatePositions(body.positions),
        },
      },
      include: { positions: templatePositionsInclude },
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
        nextVersion: template.version,
      },
    });
    return mapTemplate(template);
  }

  @Delete("templates/:id")
  async deleteTemplate(@Param("id") id: string): Promise<{ ok: true }> {
    const template = await this.prisma.kitTemplate.findFirst({
      where: { id, deletedAt: null },
    });
    if (!template) {
      throw new NotFoundException("Rucksackvorlage nicht gefunden.");
    }
    const activeKitCount = await this.prisma.kit.count({
      where: { templateId: id, deletedAt: null },
    });
    if (activeKitCount > 0) {
      throw new BadRequestException(
        "Rucksackvorlage kann erst gelöscht werden, wenn keine aktiven Rucksäcke darauf verweisen.",
      );
    }
    const deletedAt = new Date();
    await this.prisma.kitTemplate.update({
      where: { id },
      data: { deletedAt },
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "TEMPLATE_DELETED",
      entityType: "KitTemplate",
      entityId: id,
      payload: {
        name: template.name,
        version: template.version,
        deletedAt: deletedAt.toISOString(),
      },
    });
    return { ok: true };
  }

  @Roles("ADMIN", "WAREHOUSE")
  @Get("kits")
  async kits() {
    const kits = await this.prisma.kit.findMany({
      where: { deletedAt: null },
      include: {
        location: true,
        template: { include: { positions: templatePositionsInclude } },
      },
      orderBy: { code: "asc" },
    });
    return kits.map(mapKit);
  }

  @Post("kits")
  async createKit(
    @Body()
    body: {
      name: string;
      code: string;
      locationId: string;
      templateId: string;
    },
  ) {
    if (
      !body.name?.trim() ||
      !body.code?.trim() ||
      !body.locationId ||
      !body.templateId
    ) {
      throw new BadRequestException(
        "Name, Code, Lagerort und Vorlage sind erforderlich.",
      );
    }
    await this.assertKitReferences(body.locationId, body.templateId);
    const kit = await this.prisma.kit.create({
      data: {
        name: body.name.trim(),
        code: body.code.trim(),
        locationId: body.locationId,
        templateId: body.templateId,
        status: "READY",
        publicToken: randomBytes(24).toString("base64url"),
        tokenRotatedAt: new Date(),
      },
      include: {
        location: true,
        template: { include: { positions: templatePositionsInclude } },
      },
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "KIT_CREATED",
      entityType: "Kit",
      entityId: kit.id,
    });
    return mapKit(kit);
  }

  @Patch("kits/:id")
  async updateKit(
    @Param("id") id: string,
    @Body()
    body: {
      name: string;
      code: string;
      locationId: string;
      templateId: string;
    },
  ) {
    if (
      !body.name?.trim() ||
      !body.code?.trim() ||
      !body.locationId ||
      !body.templateId
    ) {
      throw new BadRequestException(
        "Name, Code, Lagerort und Vorlage sind erforderlich.",
      );
    }
    const existing = await this.prisma.kit.findFirst({
      where: { id, deletedAt: null },
      include: {
        location: true,
        template: { include: { positions: templatePositionsInclude } },
      },
    });
    if (!existing) {
      throw new NotFoundException("Rucksack nicht gefunden.");
    }
    await this.assertKitReferences(body.locationId, body.templateId);
    const kit = await this.prisma.kit.update({
      where: { id },
      data: {
        name: body.name.trim(),
        code: body.code.trim(),
        locationId: body.locationId,
        templateId: body.templateId,
      },
      include: {
        location: true,
        template: { include: { positions: templatePositionsInclude } },
      },
    });
    await this.prisma.medicalDevice.updateMany({
      where: { kitId: id },
      data: { locationId: kit.locationId },
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
          templateId: existing.templateId,
        },
        next: {
          name: kit.name,
          code: kit.code,
          locationId: kit.locationId,
          templateId: kit.templateId,
        },
      },
    });
    return mapKit(kit);
  }

  @Post("kits/:id/rotate-token")
  async rotateToken(@Param("id") id: string) {
    const existing = await this.prisma.kit.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException("Rucksack nicht gefunden.");
    }
    const kit = await this.prisma.kit.update({
      where: { id },
      data: {
        publicToken: randomBytes(24).toString("base64url"),
        tokenRotatedAt: new Date(),
      },
      include: {
        location: true,
        template: { include: { positions: templatePositionsInclude } },
      },
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "KIT_TOKEN_ROTATED",
      entityType: "Kit",
      entityId: kit.id,
    });
    return mapKit(kit);
  }

  @Delete("kits/:id")
  async deleteKit(@Param("id") id: string): Promise<{ ok: true }> {
    const kit = await this.prisma.kit.findFirst({
      where: { id, deletedAt: null },
    });
    if (!kit) {
      throw new NotFoundException("Rucksack nicht gefunden.");
    }
    const medicalDeviceCount = await this.prisma.medicalDevice.count({
      where: { kitId: id },
    });
    const openOrderCount = await this.prisma.replenishmentOrder.count({
      where: { kitId: id, status: "OPEN" },
    });
    if (medicalDeviceCount > 0) {
      throw new BadRequestException(
        "Rucksack kann erst gelöscht werden, wenn keine Geräte mehr darauf verweisen.",
      );
    }
    if (openOrderCount > 0) {
      throw new BadRequestException(
        "Rucksack kann erst gelöscht werden, wenn keine offenen Nachfüllaufträge existieren.",
      );
    }
    const deletedAt = new Date();
    await this.prisma.kit.update({ where: { id }, data: { deletedAt } });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "KIT_DELETED",
      entityType: "Kit",
      entityId: id,
      payload: {
        name: kit.name,
        code: kit.code,
        deletedAt: deletedAt.toISOString(),
      },
    });
    return { ok: true };
  }

  private async nextTemplateVersion(name: string): Promise<number> {
    const latest = await this.prisma.kitTemplate.findFirst({
      where: { name },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    return (latest?.version ?? 0) + 1;
  }

  private async nextArticleSortOrder(): Promise<number> {
    const latest = await this.prisma.article.findFirst({
      where: { deletedAt: null },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    return (latest?.sortOrder ?? 0) + 1;
  }

  private async normalizeOptionalSupplierId(supplierId?: string) {
    const normalized = supplierId?.trim();
    if (!normalized) return null;
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: normalized, deletedAt: null },
      select: { id: true },
    });
    if (!supplier) {
      throw new BadRequestException("Lieferant nicht gefunden.");
    }
    return normalized;
  }

  private async assertUniqueActiveSupplierName(name: string, ignoreId?: string) {
    const existing = await this.prisma.supplier.findFirst({
      where: {
        name,
        deletedAt: null,
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException("Lieferant existiert bereits.");
    }
  }

  private async validateTemplatePositions(
    positions: Array<{
      articleId: string;
      moduleName?: string;
      requiredQuantity: number;
      critical?: boolean;
    }>,
  ) {
    const positionPayload = positions.map((position, index) => {
      const requiredQuantity = Math.trunc(position.requiredQuantity);
      if (
        !position.articleId?.trim() ||
        !Number.isFinite(requiredQuantity) ||
        requiredQuantity <= 0
      ) {
        throw new BadRequestException(
          "Jede Vorlagenposition benötigt Artikel und Sollmenge.",
        );
      }
      return {
        articleId: position.articleId,
        sortOrder: index + 1,
        moduleName: position.moduleName?.trim() || undefined,
        requiredQuantity,
        critical: Boolean(position.critical),
      };
    });

    const articleIds = [
      ...new Set(positionPayload.map((position) => position.articleId)),
    ];
    const knownArticleCount = await this.prisma.article.count({
      where: { id: { in: articleIds }, deletedAt: null },
    });
    if (knownArticleCount !== articleIds.length) {
      throw new BadRequestException(
        "Mindestens eine Vorlagenposition verweist auf einen unbekannten Artikel.",
      );
    }

    return positionPayload;
  }

  private async assertKitReferences(
    locationId: string,
    templateId: string,
  ): Promise<void> {
    const [location, template] = await Promise.all([
      this.prisma.location.findFirst({
        where: { id: locationId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.kitTemplate.findFirst({
        where: { id: templateId, deletedAt: null },
        select: { id: true },
      }),
    ]);
    if (!location) {
      throw new BadRequestException("Lagerort nicht gefunden.");
    }
    if (!template) {
      throw new BadRequestException("Rucksackvorlage nicht gefunden.");
    }
  }
}

type ArticleWriteBody = {
  name: string;
  unit: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  category?: string;
  barcode?: string;
  articleUrl?: string;
  defaultSupplierId?: string;
  unitsPerPackage?: number | string;
  defaultGrossPriceCents?: number | string;
  sterile?: boolean;
  medicalDevice?: boolean;
  stkRequired?: boolean;
  stkIntervalMonths?: number | string;
  mtkRequired?: boolean;
  mtkIntervalMonths?: number | string;
  storageNotes?: string;
  notes?: string;
  criticalDefault?: boolean;
};

type SupplierWriteBody = {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  notes?: string;
};

function toSupplierWriteData(body: SupplierWriteBody) {
  return {
    name: normalizeRequiredText(body.name, "Lieferantenname ist erforderlich."),
    contactPerson: optionalText(body.contactPerson),
    email: optionalEmail(body.email, "Lieferanten-E-Mail muss gültig sein."),
    phone: optionalText(body.phone),
    website: optionalUrl(
      body.website,
      "Lieferanten-Website muss eine gültige http- oder https-URL sein.",
    ),
    street: optionalText(body.street),
    postalCode: optionalText(body.postalCode),
    city: optionalText(body.city),
    country: optionalText(body.country),
    notes: optionalText(body.notes),
  };
}

function toArticleWriteData(
  body: ArticleWriteBody,
  defaultSupplierId: string | null,
) {
  const stkRequired = Boolean(body.stkRequired);
  const mtkRequired = Boolean(body.mtkRequired);
  return {
    name: body.name.trim(),
    unit: body.unit.trim(),
    manufacturer: optionalText(body.manufacturer),
    manufacturerPartNumber: optionalText(body.manufacturerPartNumber),
    category: optionalText(body.category),
    barcode: optionalText(body.barcode),
    articleUrl: optionalUrl(body.articleUrl),
    defaultSupplierId,
    unitsPerPackage: normalizeOptionalPositiveInteger(
      body.unitsPerPackage,
      "VE muss als positive ganze Zahl angegeben werden.",
    ),
    defaultGrossPriceCents: normalizeOptionalCents(body.defaultGrossPriceCents),
    sterile: Boolean(body.sterile),
    medicalDevice: Boolean(body.medicalDevice),
    stkRequired,
    stkIntervalMonths: normalizeControlInterval(
      body.stkIntervalMonths,
      stkRequired,
      "STK",
    ),
    mtkRequired,
    mtkIntervalMonths: normalizeControlInterval(
      body.mtkIntervalMonths,
      mtkRequired,
      "MTK",
    ),
    storageNotes: optionalText(body.storageNotes),
    notes: optionalText(body.notes),
    criticalDefault: Boolean(body.criticalDefault),
  };
}

function normalizeControlInterval(
  value: number | string | undefined,
  required: boolean,
  label: string,
) {
  if (!required) {
    if (value !== undefined && String(value).trim() !== "") {
      throw new BadRequestException(
        `${label}-Intervall darf nur gesetzt werden, wenn ${label} erforderlich ist.`,
      );
    }
    return null;
  }

  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new BadRequestException(
      `${label}-Intervall muss eine positive ganze Zahl in Monaten sein.`,
    );
  }
  return normalized;
}

function optionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeRequiredText(value: string | undefined, message: string) {
  const normalized = value?.trim();
  if (!normalized) throw new BadRequestException(message);
  return normalized;
}

function optionalEmail(value: string | undefined, message: string) {
  const normalized = optionalText(value);
  if (!normalized) return null;
  const email = normalized.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new BadRequestException(message);
  }
  return email;
}

function optionalUrl(value?: string, message?: string) {
  const normalized = optionalText(value);
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("unsupported protocol");
    }
    return parsed.toString();
  } catch {
    throw new BadRequestException(
      message ?? "Artikel-Link muss eine gültige http- oder https-URL sein.",
    );
  }
}

function normalizeOptionalCents(value: number | string | undefined) {
  if (value === undefined || String(value).trim() === "") return null;
  const normalized = Math.trunc(Number(value));
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new BadRequestException(
      "Preis muss als ganze Cent-Zahl größer oder gleich 0 angegeben werden.",
    );
  }
  return normalized;
}

function normalizeOptionalPositiveInteger(
  value: number | string | undefined,
  message: string,
) {
  if (value === undefined || String(value).trim() === "") return null;
  const normalized = Math.trunc(Number(value));
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new BadRequestException(message);
  }
  return normalized;
}

function isPrismaUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function mapArticle(
  article: Awaited<
    ReturnType<
      PrismaService["article"]["findFirst"]
    >
  > & { defaultSupplier?: { id: string; name: string } | null },
) {
  if (!article) {
    throw new Error("Article is required.");
  }
  return {
    id: article.id,
    name: article.name,
    unit: article.unit,
    manufacturer: article.manufacturer ?? undefined,
    manufacturerPartNumber: article.manufacturerPartNumber ?? undefined,
    category: article.category ?? undefined,
    barcode: article.barcode ?? undefined,
    articleUrl: article.articleUrl ?? undefined,
    defaultSupplierId: article.defaultSupplierId ?? undefined,
    defaultSupplierName: article.defaultSupplier?.name ?? undefined,
    unitsPerPackage: article.unitsPerPackage ?? undefined,
    defaultGrossPriceCents: article.defaultGrossPriceCents ?? undefined,
    sterile: article.sterile,
    medicalDevice: article.medicalDevice,
    stkRequired: article.stkRequired,
    stkIntervalMonths: article.stkIntervalMonths ?? undefined,
    mtkRequired: article.mtkRequired,
    mtkIntervalMonths: article.mtkIntervalMonths ?? undefined,
    storageNotes: article.storageNotes ?? undefined,
    notes: article.notes ?? undefined,
    criticalDefault: article.criticalDefault,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}
