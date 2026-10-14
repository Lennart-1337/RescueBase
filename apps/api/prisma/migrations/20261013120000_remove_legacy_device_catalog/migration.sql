-- MPG devices are stored independently in MpgDevice.
DROP TABLE `MedicalDevice`;

-- Resolve obsolete catalogue alerts and remove subscriptions to their producer.
UPDATE `AlertEvent` SET `resolvedAt` = CURRENT_TIMESTAMP(3)
WHERE `sourceType` = 'MEDICAL_DEVICE' AND `resolvedAt` IS NULL;
DELETE FROM `AlertSubscription` WHERE `category` IN ('STK_DUE', 'MTK_DUE');
