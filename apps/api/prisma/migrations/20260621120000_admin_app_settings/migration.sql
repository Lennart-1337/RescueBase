ALTER TABLE `InventoryAutomationConfig`
  ADD COLUMN `enabled` BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE `AppSettings` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
  `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
  `newUserOrderNotificationsDefaultEnabled` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AlertAutomationConfig` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
  `dailyDigestEnabled` BOOLEAN NOT NULL DEFAULT true,
  `dailyDigestTime` VARCHAR(191) NOT NULL DEFAULT '06:00',
  `warningWindowDays` INTEGER NOT NULL DEFAULT 90,
  `lastDigestSentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `NotificationTemplate` (
  `key` ENUM('ALERT_IMMEDIATE', 'ALERT_DIGEST', 'NEW_ORDER') NOT NULL,
  `subjectTemplate` VARCHAR(191) NOT NULL,
  `introTemplate` TEXT NOT NULL,
  `bodyTemplate` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `AlertAutomationConfig` (`id`, `lastDigestSentAt`, `updatedAt`)
  SELECT 'singleton', `lastRunAt`, CURRENT_TIMESTAMP(3) FROM `AlertJobState` WHERE `id` = 'daily-alert-digest'
  UNION ALL SELECT 'singleton', NULL, CURRENT_TIMESTAMP(3) WHERE NOT EXISTS (SELECT 1 FROM `AlertJobState` WHERE `id` = 'daily-alert-digest');
DROP TABLE `AlertJobState`;
