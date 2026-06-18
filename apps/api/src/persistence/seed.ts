import type { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

export async function seedRescueBaseDevelopmentData(prisma: PrismaClient): Promise<void> {
  const adminPasswordHash = await hash(process.env.RESCUEBASE_DEV_ADMIN_PASSWORD ?? "rescuebase-admin", 12);
  const warehousePasswordHash = await hash(process.env.RESCUEBASE_DEV_WAREHOUSE_PASSWORD ?? "rescuebase-lager", 12);

  await prisma.user.upsert({
    where: { email: "admin@rescuebase.local" },
    update: { passwordHash: adminPasswordHash },
    create: {
      id: "user-admin",
      email: "admin@rescuebase.local",
      displayName: "Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      twoFactorEnabled: false,
      active: true
    }
  });
  await prisma.user.upsert({
    where: { email: "lager@rescuebase.local" },
    update: { passwordHash: warehousePasswordHash },
    create: {
      id: "user-lager",
      email: "lager@rescuebase.local",
      displayName: "Lagerteam",
      passwordHash: warehousePasswordHash,
      role: "WAREHOUSE",
      twoFactorEnabled: false,
      active: true
    }
  });

  await prisma.location.upsert({
    where: { id: "loc-main" },
    update: {},
    create: { id: "loc-main", name: "Hauptlager", kind: "STORAGE" }
  });
  await prisma.location.upsert({
    where: { id: "loc-rtw-1" },
    update: {},
    create: { id: "loc-rtw-1", name: "Fahrzeug 1", kind: "VEHICLE" }
  });

  await prisma.article.upsert({
    where: { id: "article-bandage" },
    update: {},
    create: {
      id: "article-bandage",
      name: "Verbandpäckchen mittel",
      unit: "Stück",
      manufacturer: "MediSafe",
      manufacturerPartNumber: "VB-1000",
      category: "Verbandmaterial",
      barcode: "040000000001",
      articleUrl: "https://shop.example.org/articles/verbandpaeckchen-mittel",
      sterile: true,
      storageNotes: "Trocken lagern",
      criticalDefault: false
    }
  });
  await prisma.article.upsert({
    where: { id: "article-tourniquet" },
    update: {},
    create: {
      id: "article-tourniquet",
      name: "Tourniquet",
      unit: "Stück",
      manufacturer: "Rescue Tech",
      manufacturerPartNumber: "TQ-TACT-01",
      category: "Medizinprodukt",
      barcode: "040000000002",
      articleUrl: "https://shop.example.org/articles/tourniquet",
      sterile: false,
      medicalDevice: true,
      stkRequired: true,
      stkIntervalMonths: 12,
      notes: "Nur durch eingewiesenes Personal verwenden",
      criticalDefault: true
    }
  });
  await prisma.article.upsert({
    where: { id: "article-gloves" },
    update: {},
    create: {
      id: "article-gloves",
      name: "Einmalhandschuhe Größe M",
      unit: "Paar",
      manufacturer: "SafeHands",
      manufacturerPartNumber: "GL-M-200",
      category: "Schutzausrüstung",
      barcode: "040000000003",
      articleUrl: "https://shop.example.org/articles/einmalhandschuhe-m",
      sterile: false,
      storageNotes: "Vor Hitze schützen",
      criticalDefault: false
    }
  });

  await prisma.batch.upsert({
    where: { id: "batch-bandage-1" },
    update: {},
    create: {
      id: "batch-bandage-1",
      articleId: "article-bandage",
      locationId: "loc-main",
      lotNumber: "VB-2026-04",
      expiresAt: new Date("2027-04-30T00:00:00.000Z"),
      quantity: 120
    }
  });
  await prisma.batch.upsert({
    where: { id: "batch-tourniquet-1" },
    update: {},
    create: {
      id: "batch-tourniquet-1",
      articleId: "article-tourniquet",
      locationId: "loc-main",
      lotNumber: "TQ-2028-01",
      expiresAt: new Date("2028-01-31T00:00:00.000Z"),
      quantity: 18
    }
  });
  await prisma.batch.upsert({
    where: { id: "batch-gloves-1" },
    update: {},
    create: {
      id: "batch-gloves-1",
      articleId: "article-gloves",
      locationId: "loc-main",
      lotNumber: "GL-2026-08",
      expiresAt: new Date("2026-08-31T00:00:00.000Z"),
      quantity: 42
    }
  });

  await prisma.kitTemplate.upsert({
    where: { name_version: { name: "Sanitätsrucksack A", version: 1 } },
    update: {},
    create: {
      id: "template-san-a-v1",
      name: "Sanitätsrucksack A",
      version: 1,
      positions: {
        create: [
          {
            id: "pos-bandage",
            articleId: "article-bandage",
            moduleName: "Verband",
            requiredQuantity: 6,
            critical: false
          },
          {
            id: "pos-tourniquet",
            articleId: "article-tourniquet",
            moduleName: "Blutung",
            requiredQuantity: 2,
            critical: true
          },
          {
            id: "pos-gloves",
            articleId: "article-gloves",
            requiredQuantity: 8,
            critical: false
          }
        ]
      }
    }
  });

  await prisma.kit.upsert({
    where: { code: "SAN-RS-001" },
    update: {},
    create: {
      id: "kit-rucksack-1",
      name: "Rucksack Fahrzeug 1",
      code: "SAN-RS-001",
      locationId: "loc-rtw-1",
      templateId: "template-san-a-v1",
      status: "READY",
      publicToken: "SAN-RS-001-ZUGANG-2026",
      tokenRotatedAt: new Date("2026-06-11T00:00:00.000Z")
    }
  });

  await prisma.check.upsert({
    where: { id: "check-initial-1001" },
    update: {},
    create: {
      id: "check-initial-1001",
      kitId: "kit-rucksack-1",
      checkerName: "Initialbestand",
      selectedStatus: "CONDITIONAL",
      effectiveStatus: "CONDITIONAL",
      warningsJson: ["Initialer offener Nachfüllauftrag"],
      signaturePngDataUrl: "data:image/png;base64,initial",
      signatureHash: "initial"
    }
  });

  await prisma.replenishmentOrder.upsert({
    where: { checkId: "check-initial-1001" },
    update: {},
    create: {
      id: "order-1001",
      kitId: "kit-rucksack-1",
      checkId: "check-initial-1001",
      status: "OPEN",
      createdAt: new Date("2026-06-11T09:15:00.000Z"),
      updatedAt: new Date("2026-06-11T09:15:00.000Z"),
      items: {
        create: [
          {
            articleId: "article-bandage",
            articleName: "Verbandpäckchen mittel",
            templatePositionId: "pos-bandage",
            requestedQuantity: 3,
            fulfilledQuantity: 0,
            reason: "SHORTAGE_AND_DISCARDED_EXPIRED",
            unit: "Stück",
            critical: false
          },
          {
            articleId: "article-tourniquet",
            articleName: "Tourniquet",
            templatePositionId: "pos-tourniquet",
            requestedQuantity: 1,
            fulfilledQuantity: 0,
            reason: "SHORTAGE",
            unit: "Stück",
            critical: true
          }
        ]
      }
    }
  });
}
