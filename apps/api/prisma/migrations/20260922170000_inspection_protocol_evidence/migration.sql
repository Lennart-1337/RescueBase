ALTER TABLE `MpgInspection`
  ADD COLUMN `protocolVerifiedAt` DATETIME(3) NULL,
  ADD COLUMN `protocolVerifiedBy` VARCHAR(191) NULL,
  ADD COLUMN `markingConfirmedAt` DATETIME(3) NULL,
  ADD COLUMN `markingConfirmedBy` VARCHAR(191) NULL,
  ADD COLUMN `nextDueReason` TEXT NULL,
  ADD COLUMN `nextDueSource` TEXT NULL;
