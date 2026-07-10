UPDATE "User"
SET "active" = false,
    "updatedAt" = NOW()
WHERE "email" = 'admin@meherbanacworks.com';
