ALTER TABLE "WorkshopSetting"
ALTER COLUMN "workshopName" SET DEFAULT 'Meharban Car A/C Works';

ALTER TABLE "WorkshopSetting"
ALTER COLUMN "invoiceFooterNote" SET DEFAULT 'Thank you for choosing Meharban Car A/C Works. Drive cool, drive comfortable.';

UPDATE "WorkshopSetting"
SET
  "workshopName" = REPLACE(REPLACE("workshopName", 'Meherban', 'Meharban'), 'meherban', 'meharban'),
  "invoiceFooterNote" = REPLACE(REPLACE("invoiceFooterNote", 'Meherban', 'Meharban'), 'meherban', 'meharban'),
  "email" = REPLACE(REPLACE("email", 'Meherban', 'Meharban'), 'meherban', 'meharban');

UPDATE "User"
SET
  "name" = REPLACE(REPLACE("name", 'Meherban', 'Meharban'), 'meherban', 'meharban'),
  "email" = REPLACE(REPLACE("email", 'Meherban', 'Meharban'), 'meherban', 'meharban');

UPDATE "Staff"
SET
  "name" = REPLACE(REPLACE("name", 'Meherban', 'Meharban'), 'meherban', 'meharban'),
  "email" = CASE
    WHEN "email" IS NULL THEN NULL
    ELSE REPLACE(REPLACE("email", 'Meherban', 'Meharban'), 'meherban', 'meharban')
  END;

UPDATE "JobCard"
SET "serviceAdvisorName" = REPLACE(REPLACE("serviceAdvisorName", 'Meherban', 'Meharban'), 'meherban', 'meharban')
WHERE "serviceAdvisorName" IS NOT NULL;

UPDATE "WhatsAppLog"
SET "messageBody" = REPLACE(REPLACE("messageBody", 'Meherban', 'Meharban'), 'meherban', 'meharban');
