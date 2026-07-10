import { EstimateForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ jobCardId?: string }>;
}) {
  const selectedJobCardId = (await searchParams).jobCardId;
  const [jobCards, setting] = await Promise.all([
    prisma.jobCard.findMany({
      include: {
        customer: true,
        vehicle: true,
        serviceObservations: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } }),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader title="New Estimate" />
      <EstimateForm jobCards={jobCards} selectedJobCardId={selectedJobCardId} setting={setting} />
    </div>
  );
}
