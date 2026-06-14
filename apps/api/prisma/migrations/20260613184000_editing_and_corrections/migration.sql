ALTER TABLE `InventoryMovement`
  ADD COLUMN `reason` VARCHAR(191) NULL,
  ADD COLUMN `metadata` JSON NULL;
