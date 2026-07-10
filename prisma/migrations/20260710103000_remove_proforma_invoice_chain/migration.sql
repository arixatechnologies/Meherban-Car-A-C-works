-- Remove Proforma Invoice from the billing flow.
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_proformaId_fkey";
DROP INDEX IF EXISTS "Invoice_proformaId_idx";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "proformaId";

DROP TABLE IF EXISTS "ProformaInvoiceItem";
DROP TABLE IF EXISTS "ProformaInvoice";

-- Align document numbers to the linked job card sequence when there is no uniqueness conflict.
UPDATE "Estimate" e
SET "estimateNumber" = regexp_replace(j."jobCardNumber", '^[^-]+', 'EST')
FROM "JobCard" j
WHERE e."jobCardId" = j."id"
  AND e."estimateNumber" <> regexp_replace(j."jobCardNumber", '^[^-]+', 'EST')
  AND NOT EXISTS (
    SELECT 1
    FROM "Estimate" other
    WHERE other.id <> e.id
      AND other."estimateNumber" = regexp_replace(j."jobCardNumber", '^[^-]+', 'EST')
  );

UPDATE "Invoice" i
SET "invoiceNumber" = regexp_replace(j."jobCardNumber", '^[^-]+', 'INV')
FROM "JobCard" j
WHERE i."jobCardId" = j."id"
  AND i."invoiceNumber" <> regexp_replace(j."jobCardNumber", '^[^-]+', 'INV')
  AND NOT EXISTS (
    SELECT 1
    FROM "Invoice" other
    WHERE other.id <> i.id
      AND other."invoiceNumber" = regexp_replace(j."jobCardNumber", '^[^-]+', 'INV')
  );
