import { jest } from "@jest/globals";
import { CatalogController } from "../src/modules/catalog.controller.js";
import { mapTemplate } from "../src/persistence/mappers.js";
import { evaluateCheck } from "@rescuebase/domain";
import type { PrismaService } from "../src/persistence/prisma.service.js";
import type { AuditService } from "../src/services/audit.service.js";

function setup() {
  const article = { id: "a", name: "Full product name", shortName: "Checklist name", unit: "Stück", createdAt: new Date(), updatedAt: new Date() };
  const create = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(article);
  const update = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(article);
  const prisma = { article: { create, update, findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(article) } } as unknown as PrismaService;
  const audit = { record: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) } as unknown as AuditService;
  return { controller: new CatalogController(prisma, audit), create, update };
}
const base = { name: "Full product name", unit: "Stück" };

describe("article short names", () => {
  it("trims and returns a short name without replacing the full name", async () => {
    const { controller, create } = setup();
    const result = await controller.createArticle({ ...base, shortName: " Checklist name " });
    expect(create.mock.calls[0]?.[0]).toMatchObject({ data: { name: base.name, shortName: "Checklist name" } });
    expect(result).toMatchObject({ name: base.name, shortName: "Checklist name" });
  });

  it.each(["", "  ", null])("allows explicitly clearing a short name with %p", async (shortName) => {
    const { controller, update } = setup();
    await controller.updateArticle("a", { ...base, shortName });
    expect(update.mock.calls[0]?.[0]).toMatchObject({ data: { shortName: null } });
  });

  it("preserves existing short names when older clients or JSON files omit the field", async () => {
    const { controller, update } = setup();
    await controller.updateArticle("a", base);
    expect((update.mock.calls[0]?.[0] as { data: object }).data).not.toHaveProperty("shortName");
  });

  it.each([123, {}, "a".repeat(192)])("rejects invalid short names", async (shortName) => {
    const { controller, create } = setup();
    await expect(controller.createArticle({ ...base, shortName } as never)).rejects.toMatchObject({ status: 400 });
    expect(create).not.toHaveBeenCalled();
  });

  it("accepts Umlauts at the 191-character limit", async () => {
    const { controller, create } = setup();
    const shortName = "ü".repeat(191);
    await controller.createArticle({ ...base, shortName });
    expect(create.mock.calls[0]?.[0]).toMatchObject({ data: { shortName } });
  });

  it("exposes the short name separately on checklist positions and retains the full name", () => {
    const template = { id: "t", name: "Kit", version: 1, positions: [{ id: "p", articleId: "a", moduleName: null, requiredQuantity: 1, critical: false, article: { ...base, shortName: "Checklist name" } }] };
    expect(mapTemplate(template).positions[0]).toMatchObject({ articleName: base.name, articleShortName: "Checklist name" });
    const evaluation = evaluateCheck(mapTemplate(template).positions, {
      kitId: "k", checkerName: "Mara", signaturePngDataUrl: "data:image/png;base64,abc", positions: [],
    });
    expect(evaluation.positions[0]?.articleName).toBe(base.name);
    expect(evaluation.replenishmentItems[0]?.articleName).toBe(base.name);
  });
});
