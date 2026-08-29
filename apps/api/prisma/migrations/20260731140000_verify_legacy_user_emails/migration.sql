UPDATE `User`
SET `emailVerified` = true
WHERE `emailVerified` = false AND `passwordHash` IS NOT NULL;
