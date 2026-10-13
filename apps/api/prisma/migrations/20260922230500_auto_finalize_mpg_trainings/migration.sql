-- Old records could remain open after every person had signed because a separate
-- finalization action was previously required. Preserve all signatures and use
-- the last confirmation as the historical closing event.
CREATE TEMPORARY TABLE `completed_mpg_trainings` AS
SELECT t.`id`, MAX(c.`confirmedAt`) AS `finalizedAt`,
  (SELECT last_c.`confirmedBy` FROM `MpgTrainingConfirmation` last_c
   WHERE last_c.`trainingId` = t.`id`
   ORDER BY last_c.`confirmedAt` DESC, last_c.`id` DESC LIMIT 1) AS `finalizedBy`
FROM `MpgTraining` t
JOIN `MpgTrainingConfirmation` c ON c.`trainingId` = t.`id`
WHERE t.`finalizedAt` IS NULL
GROUP BY t.`id`
HAVING COUNT(*) = COUNT(c.`confirmedAt`);

UPDATE `MpgTraining` t
JOIN `completed_mpg_trainings` complete ON complete.`id` = t.`id`
SET t.`finalizedAt` = complete.`finalizedAt`, t.`finalizedBy` = complete.`finalizedBy`;

INSERT INTO `AuditEvent` (`id`, `actorType`, `actorLabel`, `action`, `entityType`, `entityId`, `payload`, `createdAt`)
SELECT CONCAT('mpg-training-auto-', complete.`id`), 'SYSTEM', 'MPG-Migration',
  'MPG_TRAINING_FINALIZED', 'MpgTraining', complete.`id`,
  JSON_OBJECT('reason', 'Historischer Abschluss nach letzter Bestätigung', 'finalizedBy', complete.`finalizedBy`), NOW()
FROM `completed_mpg_trainings` complete;

DROP TEMPORARY TABLE `completed_mpg_trainings`;
