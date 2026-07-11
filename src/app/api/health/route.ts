export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeError(error: unknown) {
  if (!(error instanceof Error)) return "Unknown error";

  if (error.message.includes("DATABASE_URL is required")) {
    return "DATABASE_URL is missing.";
  }

  if (error.message.includes("NEXTAUTH_SECRET") || error.message.includes("AUTH_SECRET")) {
    return "Auth secret is missing or too short.";
  }

  return "Database check failed. Check Vercel function logs for the exact error.";
}

export async function GET() {
  const authSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
  const checks = {
    nodeEnv: process.env.NODE_ENV || "",
    vercel: Boolean(process.env.VERCEL),
    databaseUrlSet: Boolean(process.env.DATABASE_URL),
    directUrlSet: Boolean(process.env.DIRECT_URL),
    authSecretValid: authSecret.length >= 32,
    nextAuthUrlSet: Boolean(process.env.NEXTAUTH_URL),
    appUrlSet: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    databaseConnected: false,
    adminUserReady: false,
    counts: null as null | {
      users: number;
      jobCards: number;
      estimates: number;
      invoices: number;
    },
    error: null as string | null,
  };

  try {
    const { prisma } = await import("@/lib/db");
    await prisma.$queryRaw`SELECT 1`;

    const [users, jobCards, estimates, invoices, adminUser] = await Promise.all([
      prisma.user.count(),
      prisma.jobCard.count(),
      prisma.estimate.count(),
      prisma.invoice.count(),
      prisma.user.findUnique({
        where: { email: "meharbancaracwork@gmail.com" },
        select: { active: true },
      }),
    ]);

    checks.databaseConnected = true;
    checks.adminUserReady = Boolean(adminUser?.active);
    checks.counts = { users, jobCards, estimates, invoices };
  } catch (error) {
    checks.error = safeError(error);
  }

  const ok = checks.databaseUrlSet && checks.authSecretValid && checks.databaseConnected && checks.adminUserReady;

  return Response.json(
    { ok, checks },
    {
      status: ok ? 200 : 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
