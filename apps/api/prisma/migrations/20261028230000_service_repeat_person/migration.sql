-- Retain the foreign-key index while permitting separate attendance periods per person.
CREATE INDEX `ServiceAssignment_serviceId_personId_idx` ON `ServiceAssignment`(`serviceId`, `personId`);
DROP INDEX `ServiceAssignment_serviceId_personId_key` ON `ServiceAssignment`;
