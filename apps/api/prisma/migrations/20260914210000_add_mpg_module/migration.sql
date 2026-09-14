-- AlterTable
ALTER TABLE `AlertEvent` MODIFY `category` ENUM('EXPIRY', 'STK_DUE', 'MTK_DUE', 'SHORTAGE', 'KIT_CHECK_DUE', 'MPG_DUE') NOT NULL;

-- AlterTable
ALTER TABLE `AlertSubscription` MODIFY `category` ENUM('EXPIRY', 'STK_DUE', 'MTK_DUE', 'SHORTAGE', 'KIT_CHECK_DUE', 'MPG_DUE') NOT NULL;

-- AlterTable
ALTER TABLE `MedicalDevice` ADD COLUMN `acquisitionYear` INTEGER NULL,
    ADD COLUMN `commissionedAt` DATETIME(3) NULL,
    ADD COLUMN `mpgModelId` VARCHAR(191) NULL,
    ADD COLUMN `releasedAt` DATETIME(3) NULL,
    ADD COLUMN `releasedBy` VARCHAR(191) NULL,
    ADD COLUMN `responsiblePersonId` VARCHAR(191) NULL,
    ADD COLUMN `retiredAt` DATETIME(3) NULL,
    ADD COLUMN `retirementReason` TEXT NULL,
    ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `PushSubscription` MODIFY `endpoint` TEXT NOT NULL,
    MODIFY `endpointHash` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `medicalDevicesManage` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `MpgModel` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `manufacturer` VARCHAR(191) NOT NULL,
    `manufacturerAddress` TEXT NOT NULL,
    `productType` VARCHAR(191) NOT NULL,
    `instructionsDocumentId` VARCHAR(191) NULL,
    `requirementsReviewedAt` DATETIME(3) NULL,
    `requirementsReviewedBy` VARCHAR(191) NULL,
    `requirementsReviewSource` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MpgRequirement` (
    `id` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `source` TEXT NOT NULL,
    `mandatory` BOOLEAN NOT NULL DEFAULT true,
    `intervalMonths` INTEGER NULL,
    `firstDueAt` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MpgInspection` (
    `id` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `requirementId` VARCHAR(191) NOT NULL,
    `performedAt` DATETIME(3) NOT NULL,
    `result` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NULL,
    `externalCompany` VARCHAR(191) NULL,
    `qualification` TEXT NULL,
    `reportDocumentId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `nextDueAt` DATETIME(3) NULL,
    `finalizedAt` DATETIME(3) NULL,
    `finalizedBy` VARCHAR(191) NULL,
    `correctionOfId` VARCHAR(191) NULL,
    `correctionReason` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MpgInspection_correctionOfId_key`(`correctionOfId`),
    INDEX `MpgInspection_deviceId_finalizedAt_idx`(`deviceId`, `finalizedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MpgPerson` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `internalCode` VARCHAR(191) NOT NULL,
    `affiliation` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `instructorAuthorization` TEXT NULL,
    `qualificationDocumentId` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MpgPerson_internalCode_key`(`internalCode`),
    UNIQUE INDEX `MpgPerson_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MpgTraining` (
    `id` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NULL,
    `scope` TEXT NOT NULL,
    `performedAt` DATETIME(3) NOT NULL,
    `contents` TEXT NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `instructorId` VARCHAR(191) NOT NULL,
    `finalizedAt` DATETIME(3) NULL,
    `finalizedBy` VARCHAR(191) NULL,
    `correctionOfId` VARCHAR(191) NULL,
    `correctionReason` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MpgTraining_correctionOfId_key`(`correctionOfId`),
    INDEX `MpgTraining_modelId_idx`(`modelId`),
    INDEX `MpgTraining_deviceId_idx`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MpgTrainingConfirmation` (
    `id` VARCHAR(191) NOT NULL,
    `trainingId` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `nameSnapshot` VARCHAR(191) NOT NULL,
    `confirmationText` TEXT NOT NULL,
    `signaturePngDataUrl` LONGTEXT NULL,
    `signatureHash` VARCHAR(191) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `confirmedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `MpgTrainingConfirmation_trainingId_personId_role_key`(`trainingId`, `personId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MpgGlucoseControl` (
    `id` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `performedAt` DATETIME(3) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `stripLot` VARCHAR(191) NOT NULL,
    `solutionName` VARCHAR(191) NOT NULL,
    `solutionLot` VARCHAR(191) NOT NULL,
    `solutionExpiresAt` DATETIME(3) NOT NULL,
    `controlLevel` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `targetUnit` VARCHAR(191) NOT NULL,
    `targetMin` DOUBLE NOT NULL,
    `targetMax` DOUBLE NOT NULL,
    `value` DOUBLE NOT NULL,
    `passed` BOOLEAN NOT NULL,
    `clarification` TEXT NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolvedBy` VARCHAR(191) NULL,
    `finalizedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MpgGlucoseControl_deviceId_performedAt_idx`(`deviceId`, `performedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MpgIncident` (
    `id` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `description` TEXT NOT NULL,
    `safetyRelevant` BOOLEAN NOT NULL,
    `measures` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `reportedAt` DATETIME(3) NULL,
    `reportReference` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolvedBy` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MpgDeviceAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `kitId` VARCHAR(191) NULL,
    `responsiblePersonId` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,
    `actorId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MpgCylinder` (
    `id` VARCHAR(191) NOT NULL,
    `supplier` VARCHAR(191) NOT NULL,
    `cylinderNumber` VARCHAR(191) NOT NULL,
    `sizeLiters` DOUBLE NOT NULL,
    `inspectedAt` DATETIME(3) NULL,
    `inspectionDueAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'FULL',
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MpgCylinder_cylinderNumber_key`(`cylinderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MpgCylinderAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `cylinderId` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,
    `actorId` VARCHAR(191) NOT NULL,

    INDEX `MpgCylinderAssignment_deviceId_endedAt_idx`(`deviceId`, `endedAt`),
    INDEX `MpgCylinderAssignment_cylinderId_endedAt_idx`(`cylinderId`, `endedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MpgDocument` (
    `id` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `sha256` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `deviceId` VARCHAR(191) NULL,
    `modelId` VARCHAR(191) NULL,
    `inspectionId` VARCHAR(191) NULL,
    `trainingId` VARCHAR(191) NULL,
    `personId` VARCHAR(191) NULL,
    `previousVersionId` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MpgDocument_storageKey_key`(`storageKey`),
    UNIQUE INDEX `MpgDocument_previousVersionId_key`(`previousVersionId`),
    INDEX `MpgDocument_deviceId_idx`(`deviceId`),
    INDEX `MpgDocument_modelId_idx`(`modelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MpgNotification` (
    `id` VARCHAR(191) NOT NULL,
    `eventKey` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MpgNotification_userId_createdAt_idx`(`userId`, `createdAt`),
    UNIQUE INDEX `MpgNotification_eventKey_userId_channel_key`(`eventKey`, `userId`, `channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MedicalDevice` ADD CONSTRAINT `MedicalDevice_mpgModelId_fkey` FOREIGN KEY (`mpgModelId`) REFERENCES `MpgModel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MpgRequirement` ADD CONSTRAINT `MpgRequirement_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `MpgModel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MpgInspection` ADD CONSTRAINT `MpgInspection_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `MedicalDevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MpgInspection` ADD CONSTRAINT `MpgInspection_requirementId_fkey` FOREIGN KEY (`requirementId`) REFERENCES `MpgRequirement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MpgTrainingConfirmation` ADD CONSTRAINT `MpgTrainingConfirmation_trainingId_fkey` FOREIGN KEY (`trainingId`) REFERENCES `MpgTraining`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MpgGlucoseControl` ADD CONSTRAINT `MpgGlucoseControl_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `MedicalDevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MpgIncident` ADD CONSTRAINT `MpgIncident_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `MedicalDevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MpgDeviceAssignment` ADD CONSTRAINT `MpgDeviceAssignment_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `MedicalDevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MpgCylinderAssignment` ADD CONSTRAINT `MpgCylinderAssignment_cylinderId_fkey` FOREIGN KEY (`cylinderId`) REFERENCES `MpgCylinder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MpgCylinderAssignment` ADD CONSTRAINT `MpgCylinderAssignment_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `MedicalDevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MpgNotification` ADD CONSTRAINT `MpgNotification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

