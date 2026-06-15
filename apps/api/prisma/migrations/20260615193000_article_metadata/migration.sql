ALTER TABLE `Article`
  ADD COLUMN `manufacturer` VARCHAR(191) NULL,
  ADD COLUMN `manufacturerPartNumber` VARCHAR(191) NULL,
  ADD COLUMN `category` VARCHAR(191) NULL,
  ADD COLUMN `sterile` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `storageNotes` TEXT NULL,
  ADD COLUMN `notes` TEXT NULL;
