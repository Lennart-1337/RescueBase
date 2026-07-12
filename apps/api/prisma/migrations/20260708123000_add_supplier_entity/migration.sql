CREATE TABLE `Supplier` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `Supplier_deletedAt_idx`(`deletedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Article`
  ADD COLUMN `defaultSupplierId` VARCHAR(191) NULL,
  ADD INDEX `Article_defaultSupplierId_idx`(`defaultSupplierId`);

ALTER TABLE `PurchaseOrder`
  ADD COLUMN `supplierId` VARCHAR(191) NULL,
  ADD INDEX `PurchaseOrder_supplierId_idx`(`supplierId`);

INSERT INTO `Supplier` (`id`, `name`, `createdAt`, `updatedAt`)
SELECT REPLACE(UUID(), '-', ''), `source`.`name`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM (
  SELECT DISTINCT `defaultSupplierName` AS `name`
  FROM `Article`
  WHERE `defaultSupplierName` IS NOT NULL AND TRIM(`defaultSupplierName`) <> ''
  UNION
  SELECT DISTINCT `supplierName` AS `name`
  FROM `PurchaseOrder`
  WHERE `supplierName` IS NOT NULL AND TRIM(`supplierName`) <> ''
) AS `source`;

UPDATE `Article` `article`
JOIN `Supplier` `supplier` ON `supplier`.`name` = `article`.`defaultSupplierName`
SET `article`.`defaultSupplierId` = `supplier`.`id`
WHERE `article`.`defaultSupplierName` IS NOT NULL AND TRIM(`article`.`defaultSupplierName`) <> '';

UPDATE `PurchaseOrder` `purchaseOrder`
JOIN `Supplier` `supplier` ON `supplier`.`name` = `purchaseOrder`.`supplierName`
SET `purchaseOrder`.`supplierId` = `supplier`.`id`;

ALTER TABLE `Article`
  ADD CONSTRAINT `Article_defaultSupplierId_fkey` FOREIGN KEY (`defaultSupplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PurchaseOrder`
  MODIFY `supplierId` VARCHAR(191) NOT NULL,
  ADD CONSTRAINT `PurchaseOrder_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Article`
  DROP COLUMN `defaultSupplierName`;
