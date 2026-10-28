ALTER TABLE `ServiceEvent` ADD COLUMN `deletedAt` DATETIME(3) NULL;
CREATE INDEX `ServiceEvent_deletedAt_idx` ON `ServiceEvent`(`deletedAt`);
