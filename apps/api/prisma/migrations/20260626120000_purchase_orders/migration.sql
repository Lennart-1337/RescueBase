ALTER TABLE `Article`
  ADD COLUMN `defaultSupplierName` VARCHAR(191) NULL,
  ADD COLUMN `defaultGrossPriceCents` INTEGER NULL;

CREATE TABLE `PurchaseOrder` (
  `id` VARCHAR(191) NOT NULL,
  `orderNumber` VARCHAR(191) NOT NULL,
  `supplierName` VARCHAR(191) NOT NULL,
  `locationId` VARCHAR(191) NOT NULL,
  `status` ENUM('DRAFT', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED') NOT NULL DEFAULT 'DRAFT',
  `notes` TEXT NULL,
  `approvedAt` DATETIME(3) NULL,
  `approvedByUserId` VARCHAR(191) NULL,
  `approvedByName` VARCHAR(191) NULL,
  `orderedAt` DATETIME(3) NULL,
  `receivedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PurchaseOrder_orderNumber_key`(`orderNumber`),
  INDEX `PurchaseOrder_status_updatedAt_idx`(`status`, `updatedAt`),
  INDEX `PurchaseOrder_locationId_idx`(`locationId`),
  INDEX `PurchaseOrder_approvedByUserId_idx`(`approvedByUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PurchaseOrderLine` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `articleId` VARCHAR(191) NOT NULL,
  `articleNameSnapshot` VARCHAR(191) NOT NULL,
  `supplierArticleNumberSnapshot` VARCHAR(191) NULL,
  `articleUrlSnapshot` VARCHAR(191) NULL,
  `manufacturerPartNumberSnapshot` VARCHAR(191) NULL,
  `unitSnapshot` VARCHAR(191) NOT NULL,
  `grossUnitPriceCents` INTEGER NOT NULL,
  `orderedQuantity` INTEGER NOT NULL,
  `receivedQuantity` INTEGER NOT NULL DEFAULT 0,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `PurchaseOrderLine_orderId_idx`(`orderId`),
  INDEX `PurchaseOrderLine_articleId_idx`(`articleId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PurchaseOrderReceipt` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `lineId` VARCHAR(191) NOT NULL,
  `batchId` VARCHAR(191) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `lotNumber` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `receivedAt` DATETIME(3) NOT NULL,
  `receivedBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `PurchaseOrderReceipt_orderId_idx`(`orderId`),
  INDEX `PurchaseOrderReceipt_lineId_idx`(`lineId`),
  INDEX `PurchaseOrderReceipt_batchId_idx`(`batchId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `InventoryMovement`
  ADD COLUMN `purchaseOrderId` VARCHAR(191) NULL,
  ADD INDEX `InventoryMovement_purchaseOrderId_idx`(`purchaseOrderId`);

ALTER TABLE `PurchaseOrder`
  ADD CONSTRAINT `PurchaseOrder_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `PurchaseOrder_approvedByUserId_fkey` FOREIGN KEY (`approvedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PurchaseOrderLine`
  ADD CONSTRAINT `PurchaseOrderLine_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `PurchaseOrderLine_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PurchaseOrderReceipt`
  ADD CONSTRAINT `PurchaseOrderReceipt_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `PurchaseOrderReceipt_lineId_fkey` FOREIGN KEY (`lineId`) REFERENCES `PurchaseOrderLine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `PurchaseOrderReceipt_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `InventoryMovement`
  ADD CONSTRAINT `InventoryMovement_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
