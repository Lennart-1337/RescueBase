CREATE TABLE `User` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `displayName` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NULL,
  `role` ENUM('ADMIN', 'WAREHOUSE') NOT NULL,
  `twoFactorSecret` VARCHAR(191) NULL,
  `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `User_email_key`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UserSession` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `UserSession_tokenHash_key`(`tokenHash`),
  INDEX `UserSession_userId_idx`(`userId`),
  INDEX `UserSession_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Location` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Article` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `unit` VARCHAR(191) NOT NULL,
  `barcode` VARCHAR(191) NULL,
  `criticalDefault` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Batch` (
  `id` VARCHAR(191) NOT NULL,
  `articleId` VARCHAR(191) NOT NULL,
  `locationId` VARCHAR(191) NOT NULL,
  `lotNumber` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Batch_articleId_expiresAt_idx`(`articleId`, `expiresAt`),
  INDEX `Batch_locationId_idx`(`locationId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `KitTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `version` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `KitTemplate_name_version_key`(`name`, `version`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TemplatePosition` (
  `id` VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(191) NOT NULL,
  `articleId` VARCHAR(191) NOT NULL,
  `moduleName` VARCHAR(191) NULL,
  `requiredQuantity` INTEGER NOT NULL,
  `critical` BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Kit` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `locationId` VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(191) NOT NULL,
  `status` ENUM('READY', 'CONDITIONAL', 'NOT_READY') NOT NULL DEFAULT 'READY',
  `publicToken` VARCHAR(191) NOT NULL,
  `tokenRotatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Kit_code_key`(`code`),
  UNIQUE INDEX `Kit_publicToken_key`(`publicToken`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Check` (
  `id` VARCHAR(191) NOT NULL,
  `kitId` VARCHAR(191) NOT NULL,
  `checkerName` VARCHAR(191) NOT NULL,
  `selectedStatus` ENUM('READY', 'CONDITIONAL', 'NOT_READY') NOT NULL,
  `effectiveStatus` ENUM('READY', 'CONDITIONAL', 'NOT_READY') NOT NULL,
  `statusReason` VARCHAR(191) NULL,
  `warningsJson` JSON NOT NULL,
  `signaturePngDataUrl` LONGTEXT NOT NULL,
  `signatureHash` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CheckPosition` (
  `id` VARCHAR(191) NOT NULL,
  `checkId` VARCHAR(191) NOT NULL,
  `templatePositionId` VARCHAR(191) NOT NULL,
  `articleId` VARCHAR(191) NOT NULL,
  `articleName` VARCHAR(191) NOT NULL,
  `moduleName` VARCHAR(191) NULL,
  `unit` VARCHAR(191) NOT NULL,
  `requiredQuantity` INTEGER NOT NULL,
  `countedQuantity` INTEGER NOT NULL,
  `discardedExpiredQuantity` INTEGER NOT NULL,
  `missingQuantity` INTEGER NOT NULL,
  `surplusQuantity` INTEGER NOT NULL,
  `critical` BOOLEAN NOT NULL,
  `note` VARCHAR(191) NULL,
  INDEX `CheckPosition_checkId_idx`(`checkId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReplenishmentOrder` (
  `id` VARCHAR(191) NOT NULL,
  `kitId` VARCHAR(191) NOT NULL,
  `checkId` VARCHAR(191) NOT NULL,
  `status` ENUM('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ReplenishmentOrder_checkId_key`(`checkId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReplenishmentItem` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `articleId` VARCHAR(191) NOT NULL,
  `articleName` VARCHAR(191) NOT NULL,
  `templatePositionId` VARCHAR(191) NOT NULL,
  `requestedQuantity` INTEGER NOT NULL,
  `fulfilledQuantity` INTEGER NOT NULL DEFAULT 0,
  `reason` VARCHAR(191) NOT NULL,
  `unit` VARCHAR(191) NOT NULL,
  `critical` BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InventoryMovement` (
  `id` VARCHAR(191) NOT NULL,
  `batchId` VARCHAR(191) NOT NULL,
  `articleId` VARCHAR(191) NOT NULL,
  `locationId` VARCHAR(191) NOT NULL,
  `replenishmentOrderId` VARCHAR(191) NULL,
  `templatePositionId` VARCHAR(191) NULL,
  `type` VARCHAR(191) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `actorLabel` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `InventoryMovement_batchId_idx`(`batchId`),
  INDEX `InventoryMovement_replenishmentOrderId_idx`(`replenishmentOrderId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AuditEvent` (
  `id` VARCHAR(191) NOT NULL,
  `actorType` ENUM('SYSTEM', 'USER', 'PUBLIC_CHECKER') NOT NULL,
  `actorLabel` VARCHAR(191) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AuditEvent_entityType_entityId_idx`(`entityType`, `entityId`),
  INDEX `AuditEvent_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Batch` ADD CONSTRAINT `Batch_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `UserSession` ADD CONSTRAINT `UserSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Batch` ADD CONSTRAINT `Batch_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `TemplatePosition` ADD CONSTRAINT `TemplatePosition_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `KitTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `TemplatePosition` ADD CONSTRAINT `TemplatePosition_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Kit` ADD CONSTRAINT `Kit_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Kit` ADD CONSTRAINT `Kit_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `KitTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Check` ADD CONSTRAINT `Check_kitId_fkey` FOREIGN KEY (`kitId`) REFERENCES `Kit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CheckPosition` ADD CONSTRAINT `CheckPosition_checkId_fkey` FOREIGN KEY (`checkId`) REFERENCES `Check`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ReplenishmentOrder` ADD CONSTRAINT `ReplenishmentOrder_kitId_fkey` FOREIGN KEY (`kitId`) REFERENCES `Kit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ReplenishmentOrder` ADD CONSTRAINT `ReplenishmentOrder_checkId_fkey` FOREIGN KEY (`checkId`) REFERENCES `Check`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ReplenishmentItem` ADD CONSTRAINT `ReplenishmentItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `ReplenishmentOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
