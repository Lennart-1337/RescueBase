ALTER TABLE `ServiceDocument`
  ADD COLUMN `billingKind` VARCHAR(16) NULL,
  ADD COLUMN `billingNumber` VARCHAR(64) NULL,
  ADD COLUMN `billingSnapshot` JSON NULL;
CREATE UNIQUE INDEX `ServiceDocument_billingKind_billingNumber_key`
  ON `ServiceDocument` (`billingKind`, `billingNumber`);
