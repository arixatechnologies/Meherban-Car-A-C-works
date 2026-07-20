ALTER TABLE "JobCardServiceObservation"
ADD COLUMN "category" "ItemCategory" NOT NULL DEFAULT 'PARTS';

UPDATE "JobCardServiceObservation"
SET "category" = 'LABOUR'
WHERE LOWER(COALESCE("partService", '') || ' ' || COALESCE("description", '')) ~
  'labou?r|service|check|inspection|cleaning|clean|top[- ]?up|gas filling|performance';
