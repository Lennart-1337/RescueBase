ALTER TABLE `Article`
  ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `TemplatePosition`
  ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

UPDATE `Article` AS article
JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `name` ASC, `id` ASC) AS `sortOrder`
  FROM `Article`
) AS ordered ON ordered.`id` = article.`id`
SET article.`sortOrder` = ordered.`sortOrder`;

UPDATE `TemplatePosition` AS position
JOIN (
  SELECT `id`, ROW_NUMBER() OVER (PARTITION BY `templateId` ORDER BY `id` ASC) AS `sortOrder`
  FROM `TemplatePosition`
) AS ordered ON ordered.`id` = position.`id`
SET position.`sortOrder` = ordered.`sortOrder`;
