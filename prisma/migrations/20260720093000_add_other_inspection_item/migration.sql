INSERT INTO "JobCardInspectionItem" ("id", "jobCardId", "name", "status", "remarks", "createdAt", "updatedAt")
SELECT
  'other_inspection_' || md5(job."id"),
  job."id",
  'Other',
  'OK',
  NULL,
  now(),
  now()
FROM "JobCard" job
WHERE NOT EXISTS (
  SELECT 1
  FROM "JobCardInspectionItem" item
  WHERE item."jobCardId" = job."id"
    AND item."name" = 'Other'
);
