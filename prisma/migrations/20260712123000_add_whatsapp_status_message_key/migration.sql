ALTER TABLE "WhatsAppLog"
ADD COLUMN "statusMessageKey" TEXT;

CREATE INDEX "WhatsAppLog_statusMessageKey_idx" ON "WhatsAppLog"("statusMessageKey");
