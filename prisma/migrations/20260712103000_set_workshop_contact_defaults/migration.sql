ALTER TABLE "WorkshopSetting"
ALTER COLUMN "phoneNumber" SET DEFAULT '7287948037';

ALTER TABLE "WorkshopSetting"
ALTER COLUMN "whatsappNumber" SET DEFAULT '7287948037';

ALTER TABLE "WorkshopSetting"
ALTER COLUMN "email" SET DEFAULT 'meharbancaracwork@gmail.com';

ALTER TABLE "WorkshopSetting"
ALTER COLUMN "address" SET DEFAULT 'Pantulugarimeda, Beside Visakha Eye Hospital, Autonagar, Old Gajuwaka, Visakhapatnam - 26';

UPDATE "WorkshopSetting"
SET
  "phoneNumber" = '7287948037',
  "whatsappNumber" = '7287948037',
  "email" = 'meharbancaracwork@gmail.com',
  "address" = 'Pantulugarimeda, Beside Visakha Eye Hospital, Autonagar, Old Gajuwaka, Visakhapatnam - 26',
  "updatedAt" = now()
WHERE "singletonKey" = 'default';
