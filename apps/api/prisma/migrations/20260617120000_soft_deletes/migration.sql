ALTER TABLE `User` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `Location` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `Article` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `Batch` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `KitTemplate` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `Kit` ADD COLUMN `deletedAt` DATETIME(3) NULL;

CREATE INDEX `User_deletedAt_idx` ON `User`(`deletedAt`);
CREATE INDEX `Location_deletedAt_idx` ON `Location`(`deletedAt`);
CREATE INDEX `Article_deletedAt_idx` ON `Article`(`deletedAt`);
CREATE INDEX `Batch_deletedAt_idx` ON `Batch`(`deletedAt`);
CREATE INDEX `KitTemplate_deletedAt_idx` ON `KitTemplate`(`deletedAt`);
CREATE INDEX `Kit_deletedAt_idx` ON `Kit`(`deletedAt`);
