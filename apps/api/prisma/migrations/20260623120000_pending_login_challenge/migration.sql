CREATE TABLE `PendingLoginChallenge` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `method` ENUM('TOTP', 'EMAIL') NOT NULL,
  `emailChallengeId` VARCHAR(191) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `consumedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `PendingLoginChallenge_tokenHash_key`(`tokenHash`),
  INDEX `PendingLoginChallenge_userId_idx`(`userId`),
  INDEX `PendingLoginChallenge_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PendingLoginChallenge`
  ADD CONSTRAINT `PendingLoginChallenge_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
