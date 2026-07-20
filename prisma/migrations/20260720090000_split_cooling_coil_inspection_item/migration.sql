UPDATE "JobCardInspectionItem"
SET "name" = 'Front Cooling Coil'
WHERE "name" = 'Cooling Coil';

INSERT INTO "JobCardInspectionItem" ("id", "jobCardId", "name", "status", "remarks", "createdAt", "updatedAt")
SELECT
  'rare_cooling_coil_' || md5(front."jobCardId"),
  front."jobCardId",
  'Rare Cooling Coil',
  'OK',
  NULL,
  front."createdAt" + INTERVAL '1 millisecond',
  now()
FROM "JobCardInspectionItem" front
WHERE front."name" = 'Front Cooling Coil'
  AND NOT EXISTS (
    SELECT 1
    FROM "JobCardInspectionItem" rare
    WHERE rare."jobCardId" = front."jobCardId"
      AND rare."name" = 'Rare Cooling Coil'
  );
