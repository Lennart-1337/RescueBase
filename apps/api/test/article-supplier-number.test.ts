import { jest } from "@jest/globals";
import { CatalogController } from "../src/modules/catalog.controller.js";
import type { PrismaService } from "../src/persistence/prisma.service.js";
import type { AuditService } from "../src/services/audit.service.js";
describe("article supplier number", () => {
  it("saves and returns the supplier number separately from the manufacturer's number", async () => {
    const article = {
      id: "article-imported",
      name: "Imported article",
      unit: "Stück",
      manufacturerPartNumber: "M-123",
      supplierArticleNumber: "S-456",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const create = jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(article);
    const prisma = {
      article: {
        create,
        findFirst: jest.fn<() => Promise<null>>().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const audit = {
      record: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    } as unknown as AuditService;
    const controller = new CatalogController(prisma, audit);
    const result = await controller.createArticle({
      name: article.name,
      unit: article.unit,
      manufacturerPartNumber: "M-123",
      supplierArticleNumber: " S-456 ",
    });
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        supplierArticleNumber: "S-456",
        manufacturerPartNumber: "M-123",
        defaultSupplierId: null,
      },
    });
    expect(result).toMatchObject({
      supplierArticleNumber: "S-456",
      manufacturerPartNumber: "M-123",
    });
  });
});
