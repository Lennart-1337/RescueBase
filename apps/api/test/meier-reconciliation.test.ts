import { jest } from "@jest/globals";
import "reflect-metadata";
import { readFileSync } from "node:fs";
import { REQUIRED_ROLES, RATE_LIMIT } from "../src/auth/auth.decorators.js";
import { ConflictException, BadRequestException } from "@nestjs/common";
import { CatalogArticleReconciliationController } from "../src/modules/catalog/article-reconciliation.controller.js";
import type { PrismaService } from "../src/persistence/prisma.service.js";
import type { AuditService } from "../src/services/audit.service.js";

const timestamp = "2026-10-14T10:00:00.000Z";
function setup(count = 1) {
  const article = {
    id: "article",
    updatedAt: new Date(timestamp),
    articleUrl: "https://www.meier-medizintechnik.de/product/123",
    name: "Old",
    unit: "Stück",
    medicalDevice: false,
  };
  const tx = {
    article: {
      findFirst: jest
        .fn<() => Promise<typeof article>>()
        .mockResolvedValue(article),
      updateMany: jest
        .fn<() => Promise<{ count: number }>>()
        .mockResolvedValue({ count }),
    },
  };
  const prisma = {
    article: tx.article,
    $transaction: async (action: (value: typeof tx) => unknown) => action(tx),
  } as unknown as PrismaService;
  const recordInTransaction = jest
    .fn<() => Promise<void>>()
    .mockResolvedValue(undefined);
  const audit = { recordInTransaction } as unknown as AuditService;
  return {
    controller: new CatalogArticleReconciliationController(prisma, audit),
    tx,
    recordInTransaction,
  };
}
describe("Meier reconciliation", () => {
  it("restricts reconciliation to administrators and limits supplier fetches", () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_ROLES,
        CatalogArticleReconciliationController,
      ),
    ).toEqual(["ADMIN"]);
    expect(
      Reflect.getMetadata(
        RATE_LIMIT,
        CatalogArticleReconciliationController.prototype.preview,
      ),
    ).toEqual({ limit: 60, windowMs: 60_000 });
  });
  it("reads the stored link and captures the version before fetching supplier data", async () => {
    const { controller, tx } = setup();
    const article = await tx.article.findFirst();
    article.articleUrl =
      "https://www.meier-medizintechnik.de/soehngen-kontamed-chen-kanuelensammler-abwurfbox/2009068";
    const html = readFileSync(
      new URL("./fixtures/meier/product.html", import.meta.url),
      "utf8",
    );
    const request = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => {
        article.updatedAt = new Date("2026-10-14T11:00:00.000Z");
        return new Response(html, { headers: { "content-type": "text/html" } });
      });
    try {
      const result = await controller.preview("article");
      expect(result.expectedUpdatedAt).toBe(timestamp);
      expect(result.current).toMatchObject({ name: "Old", manufacturer: null });
      expect(result.preview.data.supplierArticleNumber).toBe("2009068");
      expect(request.mock.calls[0]?.[0].toString()).toBe(article.articleUrl);
      expect(tx.article.updateMany).not.toHaveBeenCalled();
    } finally {
      request.mockRestore();
    }
  });
  it("writes only reviewed fields and audits them in the same transaction", async () => {
    const { controller, tx, recordInTransaction } = setup();
    expect(
      await controller.apply("article", {
        expectedUpdatedAt: timestamp,
        changes: { name: "New", defaultGrossPriceCents: 0 },
      }),
    ).toEqual({ ok: true });
    expect(tx.article.updateMany).toHaveBeenCalledWith({
      where: { id: "article", deletedAt: null, updatedAt: new Date(timestamp) },
      data: { name: "New", defaultGrossPriceCents: 0 },
    });
    expect(recordInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: "ARTICLE_MEIER_RECONCILED",
        payload: {
          previous: { name: "Old", defaultGrossPriceCents: null },
          changes: { name: "New", defaultGrossPriceCents: 0 },
        },
      }),
    );
  });
  it("rejects concurrent edits without recording a successful update", async () => {
    const { controller, recordInTransaction } = setup(0);
    await expect(
      controller.apply("article", {
        expectedUpdatedAt: timestamp,
        changes: { unit: "Paar" },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(recordInTransaction).not.toHaveBeenCalled();
  });
  it.each([
    { sterile: true },
    { name: " " },
    { unitsPerPackage: 0 },
    { defaultGrossPriceCents: -1 },
    { medicalDevice: "true" },
    { barcode: null },
    {},
    { articleUrl: "https://example.com/product/123" },
  ])("rejects unsupported or invalid changes %j", async (changes) => {
    const { controller, tx } = setup();
    await expect(
      controller.apply("article", { expectedUpdatedAt: timestamp, changes }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.article.updateMany).not.toHaveBeenCalled();
  });
  it("rejects invalid version tokens", async () => {
    await expect(
      setup().controller.apply("article", {
        expectedUpdatedAt: "yesterday",
        changes: { name: "New" },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
