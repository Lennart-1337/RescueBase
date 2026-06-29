ALTER TABLE `PurchaseOrder`
  ADD COLUMN `archivedAt` DATETIME(3) NULL;

CREATE INDEX `PurchaseOrder_archivedAt_updatedAt_idx`
  ON `PurchaseOrder`(`archivedAt`, `updatedAt`);
