ALTER TABLE `MedicalDevice`
  ADD COLUMN `kitId` VARCHAR(191) NULL AFTER `locationId`;

CREATE INDEX `MedicalDevice_kitId_idx` ON `MedicalDevice`(`kitId`);

ALTER TABLE `MedicalDevice`
  ADD CONSTRAINT `MedicalDevice_kitId_fkey`
  FOREIGN KEY (`kitId`) REFERENCES `Kit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
