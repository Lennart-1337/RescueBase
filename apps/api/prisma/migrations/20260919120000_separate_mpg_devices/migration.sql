-- MPG records are deliberately separated from the legacy MedicalDevice table.
CREATE TABLE `MpgDevice` (
    `id` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `kitId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `serialNumber` VARCHAR(191) NULL,
    `lotCode` VARCHAR(191) NULL,
    `inventoryNumber` VARCHAR(191) NULL,
    `acquisitionYear` INTEGER NULL,
    `commissionedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `releasedAt` DATETIME(3) NULL,
    `releasedBy` VARCHAR(191) NULL,
    `retiredAt` DATETIME(3) NULL,
    `retirementReason` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `MpgDevice_inventoryNumber_key`(`inventoryNumber`),
    INDEX `MpgDevice_modelId_idx`(`modelId`),
    INDEX `MpgDevice_locationId_idx`(`locationId`),
    INDEX `MpgDevice_kitId_idx`(`kitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Keep records created by the superseded implementation, but detach and clearly
-- mark every former link to the legacy device catalogue. No row is transferred.
ALTER TABLE `MedicalDevice`
    DROP FOREIGN KEY `MedicalDevice_mpgModelId_fkey`,
    CHANGE COLUMN `mpgModelId` `legacyMpgModelId` VARCHAR(191) NULL;
ALTER TABLE `MpgInspection`
    DROP FOREIGN KEY `MpgInspection_deviceId_fkey`,
    CHANGE COLUMN `deviceId` `legacyMedicalDeviceId` VARCHAR(191) NULL;
ALTER TABLE `MpgGlucoseControl`
    DROP FOREIGN KEY `MpgGlucoseControl_deviceId_fkey`,
    CHANGE COLUMN `deviceId` `legacyMedicalDeviceId` VARCHAR(191) NULL;
ALTER TABLE `MpgIncident`
    DROP FOREIGN KEY `MpgIncident_deviceId_fkey`,
    CHANGE COLUMN `deviceId` `legacyMedicalDeviceId` VARCHAR(191) NULL;
ALTER TABLE `MpgDeviceAssignment`
    DROP FOREIGN KEY `MpgDeviceAssignment_deviceId_fkey`,
    CHANGE COLUMN `deviceId` `legacyMedicalDeviceId` VARCHAR(191) NULL;
ALTER TABLE `MpgDocument` CHANGE COLUMN `deviceId` `legacyMedicalDeviceId` VARCHAR(191) NULL;
ALTER TABLE `MpgTraining`
    CHANGE COLUMN `deviceId` `legacyMedicalDeviceId` VARCHAR(191) NULL,
    CHANGE COLUMN `scope` `legacyScope` TEXT NULL;
ALTER TABLE `MpgCylinderAssignment`
    DROP FOREIGN KEY `MpgCylinderAssignment_cylinderId_fkey`,
    DROP FOREIGN KEY `MpgCylinderAssignment_deviceId_fkey`,
    CHANGE COLUMN `deviceId` `legacyMedicalDeviceId` VARCHAR(191) NOT NULL;
RENAME TABLE `MpgCylinderAssignment` TO `LegacyMpgCylinderAssignment`;

ALTER TABLE `MpgRequirement`
    MODIFY `modelId` VARCHAR(191) NULL,
    ADD COLUMN `deviceId` VARCHAR(191) NULL,
    ADD COLUMN `justification` TEXT NULL,
    ADD INDEX `MpgRequirement_deviceId_idx`(`deviceId`);

ALTER TABLE `MpgInspection`
    ADD COLUMN `mpgDeviceId` VARCHAR(191) NULL,
    ADD COLUMN `externalName` VARCHAR(191) NULL,
    ADD INDEX `MpgInspection_mpgDeviceId_finalizedAt_idx`(`mpgDeviceId`, `finalizedAt`);

ALTER TABLE `MpgGlucoseControl`
    ADD COLUMN `mpgDeviceId` VARCHAR(191) NULL,
    ADD INDEX `MpgGlucoseControl_mpgDeviceId_performedAt_idx`(`mpgDeviceId`, `performedAt`);

ALTER TABLE `MpgIncident`
    ADD COLUMN `mpgDeviceId` VARCHAR(191) NULL,
    ADD COLUMN `effects` TEXT NULL;

ALTER TABLE `MpgDeviceAssignment`
    ADD COLUMN `mpgDeviceId` VARCHAR(191) NULL;

ALTER TABLE `MpgDocument`
    ADD COLUMN `mpgDeviceId` VARCHAR(191) NULL,
    ADD INDEX `MpgDocument_mpgDeviceId_idx`(`mpgDeviceId`);

ALTER TABLE `MpgPerson`
    ADD COLUMN `birthDate` DATETIME(3) NULL,
    ADD COLUMN `instructorAuthorized` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `authorizationValidUntil` DATETIME(3) NULL,
    MODIFY `internalCode` VARCHAR(191) NULL,
    MODIFY `affiliation` VARCHAR(191) NULL;

ALTER TABLE `MpgTraining` MODIFY `documentId` VARCHAR(191) NULL;
ALTER TABLE `MpgCylinder` MODIFY `supplier` VARCHAR(191) NULL;

ALTER TABLE `MpgDevice`
    ADD CONSTRAINT `MpgDevice_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `MpgModel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `MpgDevice_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `MpgDevice_kitId_fkey` FOREIGN KEY (`kitId`) REFERENCES `Kit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MpgRequirement` ADD CONSTRAINT `MpgRequirement_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `MpgDevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MpgInspection` ADD CONSTRAINT `MpgInspection_mpgDeviceId_fkey` FOREIGN KEY (`mpgDeviceId`) REFERENCES `MpgDevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MpgGlucoseControl` ADD CONSTRAINT `MpgGlucoseControl_mpgDeviceId_fkey` FOREIGN KEY (`mpgDeviceId`) REFERENCES `MpgDevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MpgIncident` ADD CONSTRAINT `MpgIncident_mpgDeviceId_fkey` FOREIGN KEY (`mpgDeviceId`) REFERENCES `MpgDevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MpgDeviceAssignment` ADD CONSTRAINT `MpgDeviceAssignment_mpgDeviceId_fkey` FOREIGN KEY (`mpgDeviceId`) REFERENCES `MpgDevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MpgDocument` ADD CONSTRAINT `MpgDocument_mpgDeviceId_fkey` FOREIGN KEY (`mpgDeviceId`) REFERENCES `MpgDevice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MpgPerson` ADD CONSTRAINT `MpgPerson_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MpgTraining` ADD CONSTRAINT `MpgTraining_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `MpgModel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MpgTraining` ADD CONSTRAINT `MpgTraining_instructorId_fkey` FOREIGN KEY (`instructorId`) REFERENCES `MpgPerson`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MpgTrainingConfirmation` ADD CONSTRAINT `MpgTrainingConfirmation_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `MpgPerson`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MpgDeviceAssignment` ADD CONSTRAINT `MpgDeviceAssignment_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MpgDeviceAssignment` ADD CONSTRAINT `MpgDeviceAssignment_kitId_fkey` FOREIGN KEY (`kitId`) REFERENCES `Kit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MpgCylinder` ADD CONSTRAINT `MpgCylinder_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
