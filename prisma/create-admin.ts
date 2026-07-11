import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = (process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || "meharbancaracwork@gmail.com")
    .toLowerCase()
    .trim();
  const password = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || "Meharban@786";
  const name = process.env.ADMIN_NAME || "Meharban";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    create: {
      name,
      email,
      passwordHash,
      role: UserRole.ADMIN,
      active: true,
    },
    update: {
      name,
      passwordHash,
      role: UserRole.ADMIN,
      active: true,
    },
  });

  console.log(`Admin user is ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
