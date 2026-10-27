ALTER TABLE `ServiceEvent`
  ADD COLUMN `materialDiscounted` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `pricingModel` VARCHAR(191) NOT NULL DEFAULT 'HOURLY';

-- Preserve completed calculations; a deliberate edit after reopening opts into hourly pricing.
UPDATE `ServiceEvent` SET `pricingModel` = 'LEGACY' WHERE `status` = 'COMPLETED';

ALTER TABLE `ServiceAssignment`
  ADD COLUMN `hourlyRate` DECIMAL(14,4) NOT NULL DEFAULT 0,
  DROP COLUMN `breakMinutes`,
  DROP COLUMN `actualBreakMinutes`;
