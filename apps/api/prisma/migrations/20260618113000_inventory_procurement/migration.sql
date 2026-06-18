CREATE TABLE `InventoryTarget` (
  `id` VARCHAR(191) NOT NULL,
  `articleId` VARCHAR(191) NOT NULL,
  `locationId` VARCHAR(191) NOT NULL,
  `targetQuantity` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `InventoryTarget_articleId_locationId_key`(`articleId`, `locationId`),
  INDEX `InventoryTarget_locationId_idx`(`locationId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InventoryProcurementOrder` (
  `id` VARCHAR(191) NOT NULL,
  `articleId` VARCHAR(191) NOT NULL,
  `locationId` VARCHAR(191) NOT NULL,
  `status` ENUM('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  `requestedQuantity` INTEGER NOT NULL,
  `receivedQuantity` INTEGER NOT NULL DEFAULT 0,
  `articleUrlSnapshot` VARCHAR(191) NULL,
  `activeKey` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `InventoryProcurementOrder_activeKey_key`(`activeKey`),
  INDEX `InventoryProcurementOrder_articleId_locationId_status_idx`(`articleId`, `locationId`, `status`),
  INDEX `InventoryProcurementOrder_locationId_idx`(`locationId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InventoryProcurementReceipt` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `batchId` VARCHAR(191) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `lotNumber` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `verifiedAt` DATETIME(3) NOT NULL,
  `verifiedBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `InventoryProcurementReceipt_orderId_idx`(`orderId`),
  INDEX `InventoryProcurementReceipt_batchId_idx`(`batchId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InventoryAutomationConfig` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
  `dailyReconcileTime` VARCHAR(191) NOT NULL DEFAULT '02:00',
  `lastReconciledAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `InventoryMovement`
  ADD COLUMN `inventoryProcurementOrderId` VARCHAR(191) NULL,
  ADD INDEX `InventoryMovement_inventoryProcurementOrderId_idx`(`inventoryProcurementOrderId`);

ALTER TABLE `InventoryTarget`
  ADD CONSTRAINT `InventoryTarget_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `InventoryTarget_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `InventoryProcurementOrder`
  ADD CONSTRAINT `InventoryProcurementOrder_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `InventoryProcurementOrder_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `InventoryProcurementReceipt`
  ADD CONSTRAINT `InventoryProcurementReceipt_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `InventoryProcurementOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `InventoryProcurementReceipt_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `InventoryMovement`
  ADD CONSTRAINT `InventoryMovement_inventoryProcurementOrderId_fkey` FOREIGN KEY (`inventoryProcurementOrderId`) REFERENCES `InventoryProcurementOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
