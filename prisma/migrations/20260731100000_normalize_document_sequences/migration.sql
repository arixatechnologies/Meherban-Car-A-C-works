UPDATE "JobCard"
SET "jobCardNumber" = regexp_replace(
  "jobCardNumber",
  '[0-9]+$',
  lpad((substring("jobCardNumber" from '([0-9]+)$')::int)::text, 2, '0')
)
WHERE "jobCardNumber" ~ '-0+[0-9]+$';

UPDATE "Estimate"
SET "estimateNumber" = regexp_replace(
  "estimateNumber",
  '[0-9]+$',
  lpad((substring("estimateNumber" from '([0-9]+)$')::int)::text, 2, '0')
)
WHERE "estimateNumber" ~ '-0+[0-9]+$';

UPDATE "Invoice"
SET "invoiceNumber" = regexp_replace(
  "invoiceNumber",
  '[0-9]+$',
  lpad((substring("invoiceNumber" from '([0-9]+)$')::int)::text, 2, '0')
)
WHERE "invoiceNumber" ~ '-0+[0-9]+$';
