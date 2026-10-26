-- AlterTable
ALTER TABLE `User` ADD COLUMN `servicesManage` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `MpgPerson` ADD COLUMN `personId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Person` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `userId` VARCHAR(191) NULL,
    `leader` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Person_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PersonQualification` (
    `id` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `qualification` VARCHAR(191) NOT NULL,
    `validUntil` DATETIME(3) NULL,
    `recognizedQualifications` JSON NOT NULL,

    UNIQUE INDEX `PersonQualification_personId_qualification_key`(`personId`, `qualification`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceVehicle` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `registration` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `ready` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceTariff` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `costRate` DECIMAL(14, 4) NOT NULL,
    `saleRate` DECIMAL(14, 4) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceChecklist` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `tasks` JSON NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceEvent` (
    `id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'MEDICAL',
    `status` VARCHAR(191) NOT NULL DEFAULT 'INQUIRY',
    `title` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `customer` VARCHAR(191) NOT NULL,
    `organizer` VARCHAR(191) NOT NULL,
    `leadOrganization` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(191) NOT NULL,
    `contactEmail` VARCHAR(191) NOT NULL,
    `contactPhone` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `eventStartsAt` DATETIME(3) NOT NULL,
    `eventEndsAt` DATETIME(3) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `responsibleId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `requirements` TEXT NOT NULL,
    `supportOnly` BOOLEAN NOT NULL DEFAULT false,
    `agreedRevenue` DECIMAL(14, 2) NULL,
    `outcome` JSON NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceEvent_startsAt_endsAt_idx`(`startsAt`, `endsAt`),
    INDEX `ServiceEvent_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServicePosition` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `qualification` VARCHAR(191) NOT NULL,
    `leader` BOOLEAN NOT NULL DEFAULT false,
    `quantity` INTEGER NOT NULL,
    `team` VARCHAR(191) NULL,

    INDEX `ServicePosition_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `positionId` VARCHAR(191) NOT NULL,
    `qualification` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `breakMinutes` INTEGER NOT NULL DEFAULT 0,
    `actualStartsAt` DATETIME(3) NULL,
    `actualEndsAt` DATETIME(3) NULL,
    `actualBreakMinutes` INTEGER NOT NULL DEFAULT 0,

    INDEX `ServiceAssignment_startsAt_endsAt_idx`(`startsAt`, `endsAt`),
    UNIQUE INDEX `ServiceAssignment_serviceId_personId_key`(`serviceId`, `personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceReservation` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,

    INDEX `ServiceReservation_kind_resourceId_idx`(`kind`, `resourceId`),
    INDEX `ServiceReservation_startsAt_endsAt_idx`(`startsAt`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceTask` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `responsibleId` VARCHAR(191) NULL,
    `dueAt` DATETIME(3) NULL,
    `done` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ServiceTask_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceCostLine` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `tariffId` VARCHAR(191) NULL,
    `plannedQuantity` DECIMAL(14, 4) NOT NULL,
    `actualQuantity` DECIMAL(14, 4) NULL,
    `costRate` DECIMAL(14, 4) NOT NULL,
    `saleRate` DECIMAL(14, 4) NOT NULL,

    INDEX `ServiceCostLine_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceCalculation` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `methodVersion` VARCHAR(191) NOT NULL,
    `sourceUrl` TEXT NOT NULL,
    `input` JSON NOT NULL,
    `result` JSON NOT NULL,
    `reason` TEXT NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ServiceCalculation_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceRelease` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `serviceVersion` INTEGER NOT NULL,
    `snapshot` JSON NOT NULL,
    `warnings` JSON NOT NULL,
    `reason` TEXT NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ServiceRelease_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceDocument` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `sha256` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ServiceDocument_storageKey_key`(`storageKey`),
    INDEX `ServiceDocument_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `MpgPerson_personId_key` ON `MpgPerson`(`personId`);

-- AddForeignKey
ALTER TABLE `MpgPerson` ADD CONSTRAINT `MpgPerson_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonQualification` ADD CONSTRAINT `PersonQualification_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServicePosition` ADD CONSTRAINT `ServicePosition_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `ServiceEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceAssignment` ADD CONSTRAINT `ServiceAssignment_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `ServiceEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceAssignment` ADD CONSTRAINT `ServiceAssignment_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceReservation` ADD CONSTRAINT `ServiceReservation_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `ServiceEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceTask` ADD CONSTRAINT `ServiceTask_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `ServiceEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceCostLine` ADD CONSTRAINT `ServiceCostLine_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `ServiceEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceCalculation` ADD CONSTRAINT `ServiceCalculation_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `ServiceEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceRelease` ADD CONSTRAINT `ServiceRelease_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `ServiceEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceDocument` ADD CONSTRAINT `ServiceDocument_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `ServiceEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Preserve existing MPG identities and every historical MPG foreign key.
INSERT INTO `Person` (`id`, `name`, `active`, `userId`, `leader`, `version`, `createdAt`, `updatedAt`)
SELECT `id`, `name`, `active`, `userId`, false, 0, `createdAt`, `updatedAt` FROM `MpgPerson`;
UPDATE `MpgPerson` SET `personId` = `id`;
