CREATE TABLE `MedicalDevice` (
  `id` VARCHAR(191) NOT NULL,
  `articleId` VARCHAR(191) NOT NULL,
  `locationId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `serialNumber` VARCHAR(191) NULL,
  `inventoryNumber` VARCHAR(191) NULL,
  `lastStkAt` DATETIME(3) NULL,
  `lastMtkAt` DATETIME(3) NULL,
  `stkIntervalMonths` INTEGER NULL,
  `mtkIntervalMonths` INTEGER NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `notes` LONGTEXT NULL,
  `deletedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `MedicalDevice_articleId_idx`(`articleId`),
  INDEX `MedicalDevice_locationId_idx`(`locationId`),
  INDEX `MedicalDevice_deletedAt_idx`(`deletedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AlertSubscription` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `category` ENUM('EXPIRY', 'STK_DUE', 'MTK_DUE') NOT NULL,
  `locationId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `AlertSubscription_userId_idx`(`userId`),
  INDEX `AlertSubscription_category_locationId_idx`(`category`, `locationId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AlertEvent` (
  `id` VARCHAR(191) NOT NULL,
  `category` ENUM('EXPIRY', 'STK_DUE', 'MTK_DUE') NOT NULL,
  `sourceType` VARCHAR(191) NOT NULL,
  `sourceId` VARCHAR(191) NOT NULL,
  `locationId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `details` LONGTEXT NOT NULL,
  `dueAt` DATETIME(3) NULL,
  `firstSeenAt` DATETIME(3) NOT NULL,
  `lastSeenAt` DATETIME(3) NOT NULL,
  `resolvedAt` DATETIME(3) NULL,
  `lastImmediateSentAt` DATETIME(3) NULL,
  `lastDigestSentAt` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `AlertEvent_category_sourceType_sourceId_key`(`category`, `sourceType`, `sourceId`),
  INDEX `AlertEvent_category_locationId_idx`(`category`, `locationId`),
  INDEX `AlertEvent_resolvedAt_idx`(`resolvedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AlertJobState` (
  `id` VARCHAR(191) NOT NULL,
  `lastRunAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MedicalDevice` ADD CONSTRAINT `MedicalDevice_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MedicalDevice` ADD CONSTRAINT `MedicalDevice_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AlertSubscription` ADD CONSTRAINT `AlertSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AlertSubscription` ADD CONSTRAINT `AlertSubscription_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `AlertEvent` ADD CONSTRAINT `AlertEvent_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
