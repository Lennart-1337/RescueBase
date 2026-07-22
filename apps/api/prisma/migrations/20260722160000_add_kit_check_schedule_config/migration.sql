CREATE TABLE `KitCheckScheduleConfig` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `intervalMonths` INTEGER NOT NULL DEFAULT 1,
  `warningLeadDays` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
