INSERT INTO `Account` (`id`, `userId`, `accountId`, `providerId`, `password`, `createdAt`, `updatedAt`)
SELECT CONCAT('legacy-credential-', `User`.`id`), `User`.`id`, `User`.`id`, 'credential', `User`.`passwordHash`, NOW(3), NOW(3)
FROM `User`
LEFT JOIN `Account`
  ON `Account`.`providerId` = 'credential' AND `Account`.`accountId` = `User`.`id`
WHERE `User`.`passwordHash` IS NOT NULL AND `Account`.`id` IS NULL;
