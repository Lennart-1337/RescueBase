-- Restore the missing historical migration chain with the SQL required
-- to align a fresh database with the current schema.

DROP INDEX `MedicalDevice_deletedAt_idx` ON `MedicalDevice`;

ALTER TABLE `AlertEvent`
  MODIFY `details` TEXT NOT NULL,
  MODIFY `metadata` JSON NULL;

ALTER TABLE `AuditEvent`
  MODIFY `payload` JSON NOT NULL;

ALTER TABLE `Check`
  MODIFY `warningsJson` JSON NOT NULL;

ALTER TABLE `InventoryMovement`
  MODIFY `metadata` JSON NULL;

ALTER TABLE `MedicalDevice`
  DROP COLUMN `deletedAt`,
  MODIFY `notes` TEXT NULL;
