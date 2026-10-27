ALTER TABLE `ServiceEvent`
  ADD COLUMN `additionalCharges` JSON NOT NULL DEFAULT '[]';
