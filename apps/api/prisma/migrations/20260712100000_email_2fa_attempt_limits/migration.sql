ALTER TABLE `EmailTwoFactorChallenge`
  ADD COLUMN `failedAttempts` INTEGER NOT NULL DEFAULT 0;
