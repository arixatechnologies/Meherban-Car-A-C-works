ALTER TABLE "WorkshopSetting"
ALTER COLUMN "currencySymbol" SET DEFAULT '₹';

UPDATE "WorkshopSetting"
SET "currencySymbol" = '₹'
WHERE "currencySymbol" IS NULL
  OR "currencySymbol" = ''
  OR "currencySymbol" = 'â‚¹'
  OR "currencySymbol" = chr(226) || chr(8218) || chr(185);
