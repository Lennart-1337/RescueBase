ALTER TABLE `AppSettings`
  ADD COLUMN `appName` VARCHAR(191) NOT NULL DEFAULT 'RescueBase',
  ADD COLUMN `appSubtitle` VARCHAR(191) NOT NULL DEFAULT 'Sanitätslager';
