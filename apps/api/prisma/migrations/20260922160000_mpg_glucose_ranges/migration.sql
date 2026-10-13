CREATE TABLE `MpgGlucoseRange` (
    `id` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `solutionName` VARCHAR(191) NOT NULL,
    `solutionLot` VARCHAR(191) NOT NULL,
    `solutionExpiresAt` DATETIME(3) NOT NULL,
    `stripLot` VARCHAR(191) NOT NULL,
    `controlLevel` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `targetMin` DOUBLE NOT NULL,
    `targetMax` DOUBLE NOT NULL,
    `source` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `MpgGlucoseRange_modelId_idx`(`modelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MpgGlucoseControl`
    ADD COLUMN `rangeSource` TEXT NULL,
    ADD COLUMN `glucoseRangeId` VARCHAR(191) NULL;

ALTER TABLE `MpgGlucoseRange` ADD CONSTRAINT `MpgGlucoseRange_modelId_fkey`
    FOREIGN KEY (`modelId`) REFERENCES `MpgModel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MpgGlucoseControl` ADD CONSTRAINT `MpgGlucoseControl_glucoseRangeId_fkey`
    FOREIGN KEY (`glucoseRangeId`) REFERENCES `MpgGlucoseRange`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
