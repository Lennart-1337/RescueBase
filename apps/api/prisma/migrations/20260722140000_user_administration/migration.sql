ALTER TABLE `UserInvitation` ADD COLUMN `revokedAt` DATETIME(3) NULL;

CREATE TABLE `UserEmailChange` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `confirmedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `UserEmailChange_tokenHash_key`(`tokenHash`),
  INDEX `UserEmailChange_userId_idx`(`userId`),
  INDEX `UserEmailChange_email_idx`(`email`),
  INDEX `UserEmailChange_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `UserEmailChange_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
